import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, message, Typography, Tag, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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
            const pinyins: any[] = [];
            Object.entries(conf).forEach(([py, val]: [string, any]) => {
                if (py !== '__ignoreAll') {
                    pinyins.push({ pinyin: py, replacement: val.replacement || '', ignore: val.ignore === true });
                }
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

    const columns = [
        {
            title: '多音字',
            dataIndex: 'char',
            key: 'char',
            width: 150,
            render: (text: string, record: CharConfig) => (
                <Space direction="vertical">
                    <Text strong style={{ fontSize: 18, color: '#f5222d' }}>{text}</Text>
                    <label>
                        <input 
                            type="checkbox" 
                            checked={record.ignoreAll}
                            onChange={(e) => handleIgnoreAllChange(record.char, e.target.checked)}
                        /> 忽略该字所有读音
                    </label>
                </Space>
            )
        },
        {
            title: '读音及配置',
            key: 'pinyins',
            render: (_: any, record: CharConfig) => (
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
                            title: '优先替换字',
                            key: 'replacement',
                            render: (_: any, p: any) => (
                                <Input 
                                    placeholder="输入替换字，留空则不替换" 
                                    value={p.replacement}
                                    onChange={e => handleReplacementChange(record.char, p.pinyin, e.target.value)}
                                    style={{ width: 180 }}
                                    disabled={p.ignore || record.ignoreAll}
                                />
                            )
                        },
                        {
                            title: '配置操作',
                            key: 'config',
                            render: (_: any, p: any) => (
                                <Space>
                                    <label>
                                        <input 
                                            type="checkbox" 
                                            checked={p.ignore}
                                            disabled={record.ignoreAll}
                                            onChange={(e) => handleIgnoreChange(record.char, p.pinyin, e.target.checked)}
                                        /> 忽略该读音
                                    </label>
                                </Space>
                            )
                        }
                    ]}
                />
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_: any, record: CharConfig) => (
                <Button type="link" danger onClick={() => handleDelete(record.char)}>
                    删除该字配置
                </Button>
            )
        }
    ];

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
                <Button type="primary" onClick={handleParse} style={{ marginTop: 16 }}>
                    解析读音
                </Button>
            </Card>

            <Card title="2. 配置替换字库 (最高优先级)">
                <Table 
                    dataSource={charConfigs} 
                    columns={columns} 
                    rowKey="char"
                    pagination={false}
                    size="small"
                />
                <Button type="primary" onClick={handleSave} style={{ marginTop: 16 }} size="large">
                    保存全局配置
                </Button>
            </Card>
        </Space>
    );
};

export default ConfigTab;
