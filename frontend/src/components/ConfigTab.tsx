import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, message, Typography, Tag, Upload, Collapse, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { pinyin } from 'pinyin-pro';

const { TextArea } = Input;
const { Text } = Typography;

interface ConfigTabProps {
    globalConfig: Record<string, any>;
    setGlobalConfig: (config: Record<string, any>) => void;
}

interface CharConfig {
    char: string;
    ignoreAll: boolean;
    pinyins: {
        pinyin: string;
        replacement: string;
        ignore: boolean;
    }[];
}

const ConfigTab: React.FC<ConfigTabProps> = ({ globalConfig, setGlobalConfig }) => {
    const [inputText, setInputText] = useState('');
    const [charConfigs, setCharConfigs] = useState<CharConfig[]>([]);

    // Convert globalConfig prop to CharConfig on initial load
    React.useEffect(() => {
        const initialConfigs: CharConfig[] = [];
        Object.entries(globalConfig).forEach(([char, conf]) => {
            const ignoreAll = conf.__ignoreAll === true;
            // 始终基于字典补全所有读音，避免「忽略全部」场景下读音列表为空
            const allPinyins = pinyin(char, { multiple: true, type: 'array' }) as string[];
            const pinyins = allPinyins.map((py: string) => {
                const saved = conf[py] || {};
                return {
                    pinyin: py,
                    replacement: saved.replacement || '',
                    ignore: saved.ignore === true,
                };
            });
            initialConfigs.push({ char, ignoreAll, pinyins });
        });
        setCharConfigs(initialConfigs);
    }, [globalConfig]);

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const chars = content.match(/[\u4e00-\u9fa5]/g) || [];
            const uniqueChars = Array.from(new Set(chars)).join('');
            setInputText(uniqueChars);
            message.success('已提取文件中的汉字');
        };
        reader.readAsText(file);
        return false;
    };

    const handleParse = () => {
        if (!inputText.trim()) {
            message.warning('请输入需要配置的汉字');
            return;
        }

        const chars = Array.from(new Set(inputText.match(/[\u4e00-\u9fa5]/g) || []));
        const newConfigs = [...charConfigs];

        chars.forEach(char => {
            const pinyins = pinyin(char, { multiple: true, type: 'array' });
            if (pinyins.length > 1) {
                let conf = newConfigs.find(c => c.char === char);
                if (!conf) {
                    conf = { char, ignoreAll: false, pinyins: [] };
                    newConfigs.push(conf);
                }
                
                pinyins.forEach(py => {
                    if (!conf!.pinyins.find(p => p.pinyin === py)) {
                        conf!.pinyins.push({ pinyin: py, replacement: '', ignore: false });
                    }
                });
            } else {
                message.info(`“${char}” 不是多音字，已跳过`);
            }
        });

        setCharConfigs(newConfigs);
        message.success('解析完成');
    };

    const handleIgnoreAllChange = (char: string, ignoreAll: boolean) => {
        setCharConfigs(charConfigs.map(c => c.char === char ? { ...c, ignoreAll } : c));
    };

    const handleReplacementChange = (char: string, py: string, val: string) => {
        setCharConfigs(charConfigs.map(c => {
            if (c.char === char) {
                return {
                    ...c,
                    pinyins: c.pinyins.map(p => p.pinyin === py ? { ...p, replacement: val } : p)
                };
            }
            return c;
        }));
    };

    const handleIgnoreChange = (char: string, py: string, ignore: boolean) => {
        setCharConfigs(charConfigs.map(c => {
            if (c.char === char) {
                return {
                    ...c,
                    pinyins: c.pinyins.map(p => p.pinyin === py ? { ...p, ignore } : p)
                };
            }
            return c;
        }));
    };

    const handleSave = () => {
        const newConfig: Record<string, any> = {};
        charConfigs.forEach(c => {
            const charObj: any = {};
            let hasConfig = false;
            
            if (c.ignoreAll) {
                charObj.__ignoreAll = true;
                hasConfig = true;
            }
            
            c.pinyins.forEach(p => {
                if (p.replacement.trim() || p.ignore) {
                    charObj[p.pinyin] = { replacement: p.replacement.trim(), ignore: p.ignore };
                    hasConfig = true;
                }
            });
            
            if (hasConfig) {
                newConfig[c.char] = charObj;
            }
        });
        setGlobalConfig(newConfig);
        message.success('配置已保存，将在检测替换时优先使用');
    };

    const handleDelete = (char: string) => {
        setCharConfigs(charConfigs.filter(c => c.char !== char));
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card title="1. 导入多音字">
                <div style={{ marginBottom: 16 }}>
                    <Text>手动输入或从TXT文件提取需要配置的多音字：</Text>
                    <Upload beforeUpload={handleUpload} showUploadList={false} accept=".txt" style={{ marginLeft: 16 }}>
                        <Button icon={<UploadOutlined />} size="small">上传TXT提取</Button>
                    </Upload>
                </div>
                <TextArea 
                    rows={3} 
                    value={inputText} 
                    onChange={e => setInputText(e.target.value)} 
                    placeholder="例如：行 长 大..."
                />
                <Button type="primary" onClick={handleParse} style={{ marginTop: 16 }} size="large">
                    解析读音
                </Button>
            </Card>

            <Card title="2. 配置替换字库 (最高优先级)">
                {charConfigs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#bfbfbf' }}>
                        暂无配置，请在上方录入需要配置的汉字
                    </div>
                ) : (
                    <Collapse
                        size="small"
                        items={charConfigs.map(record => {
                            const configuredCount = record.pinyins.filter(p => p.replacement || p.ignore).length;
                            return {
                                key: record.char,
                                label: (
                                    <Space size="middle" style={{ width: '100%' }}>
                                        <Text strong style={{ fontSize: 18, color: '#3b82f6' }}>{record.char}</Text>
                                        {record.ignoreAll ? (
                                            <Tag color="default">全部忽略</Tag>
                                        ) : configuredCount > 0 ? (
                                            <Tag color="blue">已配置 {configuredCount} / {record.pinyins.length} 个读音</Tag>
                                        ) : (
                                            <Tag>未配置</Tag>
                                        )}
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            读音：{record.pinyins.map(p => p.pinyin).join(' / ')}
                                        </Text>
                                    </Space>
                                ),
                                extra: (
                                    <Popconfirm
                                        title={`确定删除「${record.char}」的配置？`}
                                        onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.char); }}
                                        onCancel={(e) => e?.stopPropagation()}
                                        okText="删除"
                                        cancelText="取消"
                                    >
                                        <Button
                                            type="link"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            删除
                                        </Button>
                                    </Popconfirm>
                                ),
                                children: (
                                    <>
                                        <div style={{ marginBottom: 12 }}>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={record.ignoreAll}
                                                    onChange={(e) => handleIgnoreAllChange(record.char, e.target.checked)}
                                                />
                                                {' '}忽略该字所有读音
                                            </label>
                                        </div>
                                        <Table
                                            dataSource={record.pinyins}
                                            pagination={false}
                                            rowKey="pinyin"
                                            size="small"
                                            columns={[
                                                {
                                                    title: '读音',
                                                    dataIndex: 'pinyin',
                                                    key: 'pinyin',
                                                    width: 100,
                                                    render: (text: string) => <Tag color="blue">{text}</Tag>,
                                                },
                                                {
                                                    title: '优先替换字',
                                                    key: 'replacement',
                                                    render: (_: any, p: any) => (
                                                        <Input
                                                            placeholder="输入替换字，留空则不替换"
                                                            value={p.replacement}
                                                            onChange={e => handleReplacementChange(record.char, p.pinyin, e.target.value)}
                                                            style={{ width: 200 }}
                                                            disabled={p.ignore || record.ignoreAll}
                                                        />
                                                    ),
                                                },
                                                {
                                                    title: '忽略该读音',
                                                    key: 'ignore',
                                                    width: 120,
                                                    render: (_: any, p: any) => (
                                                        <label>
                                                            <input
                                                                type="checkbox"
                                                                checked={p.ignore}
                                                                disabled={record.ignoreAll}
                                                                onChange={(e) => handleIgnoreChange(record.char, p.pinyin, e.target.checked)}
                                                            /> 忽略
                                                        </label>
                                                    ),
                                                },
                                            ]}
                                        />
                                    </>
                                ),
                            };
                        })}
                    />
                )}
                <Button type="primary" onClick={handleSave} style={{ marginTop: 16 }} size="large">
                    保存全局配置
                </Button>
            </Card>
        </Space>
    );
};

export default ConfigTab;
