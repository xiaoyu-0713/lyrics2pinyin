import React, { useState } from 'react';
import { Upload, Button, Table, Typography, Space, message, Card, Collapse, Tag, Radio, Input } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import chardet from 'chardet';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { TextArea } = Input;

interface ProcessResult {
    original: string;
    result?: {
        text: string;
        tokens: any[];
        stats: any[];
    };
    replacedText?: string;
}

interface BatchRunTabProps {
    globalConfig: Record<string, Record<string, { replacement: string; ignore: boolean }>>;
}

const BatchRunTab: React.FC<BatchRunTabProps> = ({ globalConfig }) => {
    const [data, setData] = useState<ProcessResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [replaceConfig, setReplaceConfig] = useState<Record<string, { enabled: boolean; replacement: string; char?: string; pinyin?: string }>>({});
    
    const [aggregatedStats, setAggregatedStats] = useState<{ 
        char: string; 
        totalCount: number; 
        pinyins: { pinyin: string; count: number }[] 
    }[]>([]);
    const [activeCollapseKeys, setActiveCollapseKeys] = useState<string[]>(['data']);
    
    const [detectMode, setDetectMode] = useState<'all' | 'specified'>('all');
    const [specifiedChars, setSpecifiedChars] = useState('');

    const handleUploadSpecifiedChars = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const chars = content.match(/[\u4e00-\u9fa5]/g) || [];
            const uniqueChars = Array.from(new Set(chars)).join('');
            setSpecifiedChars(uniqueChars);
            message.success('已提取文件中的汉字');
        };
        reader.readAsText(file);
        return false; // Prevent default upload
    };

    const parseFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) return;

            let texts: string[] = [];

            if (ext === 'csv') {
                const encoding = chardet.detect(new Uint8Array(buffer)) || 'utf-8';
                const decoder = new TextDecoder(encoding as string);
                const csvText = decoder.decode(buffer);
                Papa.parse(csvText, {
                    complete: (results) => {
                        texts = results.data.map((row: any) => row[0]).filter((t: string) => t);
                        setData(texts.map(t => ({ original: t })));
                        setActiveCollapseKeys(['data']);
                        message.success(`成功解析 ${texts.length} 条数据`);
                    }
                });
            } else if (ext === 'xlsx' || ext === 'xls') {
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                texts = jsonData.map((row: any) => Object.values(row)[0] as string).filter(t => t);
                setData(texts.map(t => ({ original: t })));
                setActiveCollapseKeys(['data']);
                message.success(`成功解析 ${texts.length} 条数据`);
            } else {
                // txt
                const encoding = chardet.detect(new Uint8Array(buffer)) || 'utf-8';
                const decoder = new TextDecoder(encoding as string);
                const txt = decoder.decode(buffer);
                texts = txt.split('\n').map(t => t.trim()).filter(t => t);
                setData(texts.map(t => ({ original: t })));
                setActiveCollapseKeys(['data']);
                message.success(`成功解析 ${texts.length} 条数据`);
            }
        };
        reader.readAsArrayBuffer(file);
        return false; // Prevent default upload
    };

    const handleDetectAll = async () => {
        if (data.length === 0) {
            message.warning('请先上传数据');
            return;
        }
        
        let targetPolyphones: string[] | undefined = undefined;
        if (detectMode === 'specified') {
            if (!specifiedChars.trim()) {
                message.warning('请输入或上传指定的多音字');
                return;
            }
            targetPolyphones = Array.from(new Set(specifiedChars.match(/[\u4e00-\u9fa5]/g) || []));
        }

        setLoading(true);
        try {
            const texts = data.map(d => d.original);
            const res = await axios.post('http://localhost:3001/api/process/batch-texts', { 
                texts,
                targetPolyphones,
                customConfig: globalConfig
            });
            
            const newData = res.data.results;
            setData(newData);

            // aggregate stats
            const globalStats: Record<string, { totalCount: number, pinyins: Record<string, number> }> = {};

            // aggregate global config
            const newConfig = { ...replaceConfig };
            newData.forEach((d: any) => {
                if (d.result?.stats) {
                    d.result.stats.forEach((s: any) => {
                        if (!globalStats[s.char]) {
                            globalStats[s.char] = { totalCount: 0, pinyins: {} };
                        }
                        globalStats[s.char].totalCount += s.totalCount;
                        
                        s.pinyins.forEach((p: any) => {
                            globalStats[s.char].pinyins[p.pinyin] = (globalStats[s.char].pinyins[p.pinyin] || 0) + p.count;
                        });
                    });
                }
                
                d.result.tokens.forEach((t: any) => {
                    if (t.isPolyphone) {
                        const key = `${t.char}_${t.pinyin}`;
                        if (!newConfig[key]) {
                            newConfig[key] = {
                                enabled: true, // Default enable if there's a recommendation
                                replacement: t.recommendedReplacement || '',
                                char: t.char,
                                pinyin: t.pinyin
                            };
                        }
                    }
                });
            });
            
            const sortedStats = Object.entries(globalStats).map(([char, data]) => {
                const pinyins = Object.entries(data.pinyins)
                    .map(([pinyin, count]) => ({ pinyin, count }))
                    .sort((a, b) => b.count - a.count);
                return { char, totalCount: data.totalCount, pinyins };
            }).sort((a, b) => b.totalCount - a.totalCount);
            
            setAggregatedStats(sortedStats);
            setReplaceConfig(newConfig);
            message.success('批量检测完成');
            setActiveCollapseKeys(['stats', 'data']);
        } catch (error) {
            message.error('检测失败');
        } finally {
            setLoading(false);
        }
    };

    const handleReplaceAll = () => {
        const newData = data.map(d => {
            if (!d.result) return d;
            let newText = '';
            d.result.tokens.forEach((t: any) => {
                if (t.isPolyphone) {
                    const key = `${t.char}_${t.pinyin}`;
                    if (replaceConfig[key]?.enabled && replaceConfig[key]?.replacement) {
                        newText += replaceConfig[key].replacement;
                    } else {
                        newText += t.char;
                    }
                } else {
                    newText += t.char;
                }
            });
            return { ...d, replacedText: newText };
        });
        setData(newData);
        message.success('批量替换完成');
    };

    const handleExport = () => {
        const exportContent = data.map(d => d.replacedText || d.original).join('\n');
        const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '批量处理结果.txt';
        a.click();
    };

    const statsColumns = [
        {
            title: '多音字',
            dataIndex: 'char',
            key: 'char',
            width: 150,
            render: (text: string) => <Text strong style={{ fontSize: 16, color: '#f5222d' }}>{text}</Text>
        },
        {
            title: '总出现次数',
            dataIndex: 'totalCount',
            key: 'totalCount',
            width: 120,
            sorter: (a: any, b: any) => a.totalCount - b.totalCount,
        },
        {
            title: '各读音明细与配置',
            key: 'pinyins',
            render: (_: any, record: any) => (
                <Table
                    dataSource={record.pinyins}
                    pagination={false}
                    showHeader={false}
                    rowKey="pinyin"
                    size="small"
                    columns={[
                        {
                            title: '读音',
                            dataIndex: 'pinyin',
                            key: 'pinyin',
                            width: 100,
                            render: (text: string) => <Tag color="blue">{text}</Tag>
                        },
                        {
                            title: '出现次数',
                            dataIndex: 'count',
                            key: 'count',
                            width: 100,
                            render: (count: number) => <Text type="secondary">{count} 次</Text>
                        },
                        {
                            title: '替换配置',
                            key: 'config',
                            render: (_: any, p: any) => {
                                const key = `${record.char}_${p.pinyin}`;
                                const config = replaceConfig[key] || { enabled: false, replacement: '' };
                                return (
                                    <Space>
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={config.enabled}
                                                onChange={(e) => setReplaceConfig({
                                                    ...replaceConfig,
                                                    [key]: { ...config, enabled: e.target.checked }
                                                })}
                                            /> 启用替换
                                        </label>
                                        <Input 
                                            size="small"
                                            style={{ width: 80 }}
                                            value={config.replacement}
                                            disabled={!config.enabled}
                                            onChange={(e) => setReplaceConfig({
                                                ...replaceConfig,
                                                [key]: { ...config, replacement: e.target.value }
                                            })}
                                        />
                                    </Space>
                                );
                            }
                        }
                    ]}
                />
            )
        }
    ];

    const columns = [
        {
            title: '原始数据',
            dataIndex: 'original',
            key: 'original',
            width: '30%',
        },
        {
            title: '检测结果',
            key: 'detect',
            width: '40%',
            render: (_: any, record: ProcessResult) => {
                if (!record.result) return <Text type="secondary">未检测</Text>;
                return (
                    <div>
                        {record.result.tokens.map((t, i) => (
                            <span 
                                key={i} 
                                style={t.isPolyphone ? { color: '#f5222d', fontWeight: 'bold' } : {}}
                            >
                                {t.char}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            title: '替换结果',
            dataIndex: 'replacedText',
            key: 'replacedText',
            width: '30%',
            render: (text: string) => text || <Text type="secondary">未替换</Text>
        }
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card title="1. 检测配置">
                <Radio.Group 
                    value={detectMode} 
                    onChange={e => setDetectMode(e.target.value)}
                    style={{ marginBottom: 16 }}
                >
                    <Radio value="all">检测全部多音字</Radio>
                    <Radio value="specified">仅检测指定多音字</Radio>
                </Radio.Group>
                
                {detectMode === 'specified' && (
                    <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 8 }}>
                            <Text>输入或上传指定需要检测的汉字：</Text>
                            <Upload 
                                beforeUpload={handleUploadSpecifiedChars} 
                                showUploadList={false} 
                                accept=".txt"
                                style={{ marginLeft: 16 }}
                            >
                                <Button icon={<UploadOutlined />} size="small">上传TXT提取汉字</Button>
                            </Upload>
                        </div>
                        <TextArea 
                            rows={2} 
                            value={specifiedChars} 
                            onChange={e => setSpecifiedChars(e.target.value)} 
                            placeholder="例如：行 长 和..."
                        />
                    </div>
                )}
            </Card>

            <Card title="2. 上传文件 (支持 .txt, .csv, .xlsx)">
                <Dragger beforeUpload={parseFile} showUploadList={false} accept=".txt,.csv,.xlsx,.xls">
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                    <p className="ant-upload-hint">
                        每一行将作为一个独立的数据进行处理
                    </p>
                </Dragger>
                
                {data.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Text strong>已加载 {data.length} 条数据</Text>
                    </div>
                )}
            </Card>

            <Card title="3. 批量操作">
                <Space>
                    <Button type="primary" onClick={handleDetectAll} loading={loading} disabled={data.length === 0}>
                        全部检测
                    </Button>
                    <Button type="primary" onClick={handleReplaceAll} disabled={data.length === 0 || !data[0].result}>
                        全部自动替换
                    </Button>
                    <Button onClick={handleExport} disabled={data.length === 0 || !data[0].replacedText}>
                        批量全部导出
                    </Button>
                </Space>
            </Card>

            {data.length > 0 && (
                <Collapse 
                    activeKey={activeCollapseKeys} 
                    onChange={(keys) => setActiveCollapseKeys(keys as string[])}
                    style={{ marginTop: 16 }}
                >
                    {aggregatedStats.length > 0 && (
                        <Collapse.Panel header="多音字出现频率与替换配置" key="stats">
                            <Table 
                                dataSource={aggregatedStats} 
                                columns={statsColumns} 
                                rowKey={r => `${r.char}_${r.pinyin}`}
                                size="small"
                                pagination={false}
                            />
                        </Collapse.Panel>
                    )}
                    <Collapse.Panel header="原数据与加工结果列表" key="data">
                        <Table 
                            dataSource={data} 
                            columns={columns} 
                            rowKey={(r, i) => i?.toString() || r.original}
                            size="small"
                        />
                    </Collapse.Panel>
                </Collapse>
            )}
        </Space>
    );
};

export default BatchRunTab;
