import React, { useState } from 'react';
import { Input, Button, Table, Typography, Space, Tag, message, Card, Radio, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Token {
    char: string;
    isPolyphone: boolean;
    pinyin: string;
    polyphones?: string[];
    recommendedReplacement?: string;
}

interface ProcessResult {
    text: string;
    tokens: Token[];
    stats: { 
        char: string; 
        totalCount: number; 
        pinyins: { pinyin: string; count: number; recommendedReplacement: string }[] 
    }[];
}

interface SingleRunTabProps {
    globalConfig: Record<string, Record<string, { replacement: string; ignore: boolean }>>;
}

const SingleRunTab: React.FC<SingleRunTabProps> = ({ globalConfig }) => {
    const [text, setText] = useState('');
    const [detectMode, setDetectMode] = useState<'all' | 'specified'>('all');
    const [specifiedChars, setSpecifiedChars] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ProcessResult | null>(null);
    const [replaceConfig, setReplaceConfig] = useState<Record<string, { enabled: boolean; replacement: string }>>({});
    const [replacedText, setReplacedText] = useState('');

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

    const handleProcess = async () => {
        if (!text.trim()) {
            message.warning('请输入歌词');
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
            const res = await axios.post('http://localhost:3001/api/process/single', { 
                text,
                targetPolyphones,
                customConfig: globalConfig
            });
            setResult(res.data);
            
            // Initialize config keyed by char_pinyin
            const initConfig: Record<string, any> = {};
            res.data.tokens.forEach((t: Token) => {
                if (t.isPolyphone) {
                    const key = `${t.char}_${t.pinyin}`;
                    if (!initConfig[key]) {
                        initConfig[key] = {
                            enabled: true, // Default enable if there's a recommendation
                            replacement: t.recommendedReplacement || ''
                        };
                    }
                }
            });
            setReplaceConfig(initConfig);
            setReplacedText('');
        } catch (error) {
            message.error('处理失败');
        } finally {
            setLoading(false);
        }
    };

    const applyReplacement = () => {
        if (!result) return;
        let newText = '';
        result.tokens.forEach(t => {
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
        setReplacedText(newText);
        message.success('替换完成');
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(replacedText || result?.text || '');
        message.success('已复制到剪贴板');
    };

    const columns = [
        {
            title: '多音字',
            dataIndex: 'char',
            key: 'char',
            width: 100,
            render: (text: string) => <Text strong style={{ fontSize: 18, color: '#f5222d' }}>{text}</Text>
        },
        {
            title: '总出现次数',
            dataIndex: 'totalCount',
            key: 'totalCount',
            width: 100,
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
                            width: 80,
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
                            title: '推荐读音/替换字',
                            key: 'recommend',
                            width: 150,
                            render: (_: any, p: any) => (
                                <Space>
                                    <Tag color="blue">{p.pinyin}</Tag>
                                    <Tag color="green">{p.recommendedReplacement || '无'}</Tag>
                                </Space>
                            )
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
                                            /> 替换为
                                        </label>
                                        <Input 
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

            <Card title="2. 输入歌词">
                <TextArea 
                    rows={6} 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    placeholder="请输入中文歌词..."
                />
                <Button type="primary" onClick={handleProcess} loading={loading} style={{ marginTop: 16 }}>
                    检测多音字
                </Button>
            </Card>

            {result && (
                <Card title="3. 检测结果与高亮">
                    <div style={{ lineHeight: '2', fontSize: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {result.tokens.map((t, i) => (
                            <span 
                                key={i} 
                                style={t.isPolyphone ? { color: '#f5222d', fontWeight: 'bold', background: '#ffe5e5', padding: '0 2px', borderRadius: '2px' } : {}}
                                title={t.isPolyphone ? `拼音: ${t.pinyin}\n推荐替换: ${t.recommendedReplacement}` : undefined}
                            >
                                {t.char}
                            </span>
                        ))}
                    </div>
                </Card>
            )}

            {result && (
                <Card title="4. 多音字统计与替换配置">
                    <Table 
                        dataSource={result.stats} 
                        columns={columns} 
                        rowKey={(r) => `${r.char}_${r.pinyin}`}
                        pagination={false}
                    />
                    <Space style={{ marginTop: 16 }}>
                        <Button type="primary" onClick={applyReplacement}>
                            自动应用替换
                        </Button>
                    </Space>
                </Card>
            )}

            {replacedText && (
                <Card title="5. 替换结果">
                    <TextArea 
                        rows={6} 
                        value={replacedText} 
                        onChange={e => setReplacedText(e.target.value)}
                    />
                    <Space style={{ marginTop: 16 }}>
                        <Button onClick={copyToClipboard}>复制结果</Button>
                        <Button onClick={() => {
                            const blob = new Blob([replacedText], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = '处理结果.txt';
                            a.click();
                        }}>导出TXT</Button>
                    </Space>
                </Card>
            )}
        </Space>
    );
};

export default SingleRunTab;
