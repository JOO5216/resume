# 简历填写助手 0.2.7

Chrome / Edge 侧栏插件：本地简历、PDF/DOCX 文字提取、AI 简历整理、AI 字段对应、多段经历及复杂控件辅助填写。

界面优先使用本机“华文中宋”；未安装时回退到宋体。字体文件不随插件分发。

## 安装或升级

1. 克隆本仓库，或解压 `resume-copilot-v0.2.7.zip` 发布包；选择包含 `manifest.json` 的目录安装。
2. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`，开启开发者模式。
3. 首次安装：选择“加载已解压的扩展程序”，选择含 manifest.json 的文件夹。
4. 已装旧版：先导出简历备份。将新文件放回原先的插件文件夹，点击该扩展的“重新加载”，然后刷新招聘网页。换目录重新加载可能产生不同扩展 ID，届时可导入备份。
5. 用户自行打开招聘网站的简历填写页，再点击插件图标打开侧栏。已有简历时，插件自动识别当前页并展示对应预览；切换或加载新页面后也会重新识别。核对预览并点击“填写勾选字段”才会写入网页。首次访问新站点时，点击“重新识别”授予读取权限。无需构建或安装 Node.js。

## 推荐：使用已部署的本机轻量模型

本机部署位于 `D:\projects\codex-feishu\work\resume-copilot-local`，与插件分开存放，不包含在插件 ZIP 中。

1. 双击该文件夹中的 `启动本机模型.cmd`。本机服务地址是 `127.0.0.1:18765`。
2. 在插件的“设置”中点击“导入本机连接文件”，选择该目录的 `本机连接.json`。
3. 点击“保存连接”，允许浏览器连接本机地址，再点“测试连接”。
4. 口令仅在本次浏览器会话保存；完全退出并重新启动浏览器后，需要再次导入连接文件并保存。
5. 不用时双击 `停止本机模型.cmd` 释放模型内存。没有配置开机启动。

本机模型使用官方 Qwen2.5-1.5B-Instruct Q4_K_M，模型文件约 1.12 GB，使用 llama.cpp CPU 运行。无需云端 API 账号和按量费用。不要分享“本机连接.json”或 server-key.txt。插件没有自动向云端切换的逻辑。

也保留 Ollama 入口：先用 Ollama 下载模型，填写本机模型 ID，并把 `OLLAMA_ORIGINS` 设置为插件“AI 设置”显示的准确扩展来源后重启 Ollama。插件只访问 localhost:11434；本入口不要选择云端模型。

## 简历解析

1. 展开“简历 → 从 PDF / Word 整理简历”，选择 PDF、DOCX 或 TXT。
2. 检查提取出的文字，尤其是双栏 PDF 的阅读顺序；也可直接粘贴简历文字。
3. 点击“整理为草稿”。文字会发送给当前选定的 AI；选择本机模型时不会发往云端。
4. 每个字段必须能在原文中找到摘录，否则拒绝导入。核对内容、经历分组和遗漏，可直接修改草稿。
5. 点击“保存草稿为我的简历”才会替换当前简历。以后可在编辑器补充内容，或用“备份简历”导出 JSON，再用“导入备份”恢复。

支持文字型 PDF、DOCX 和 TXT。扫描图片型 PDF 尚无 OCR；旧版 DOC 请另存为 DOCX。限制 15 MB、PDF 30 页；本机模型单次最多 8000 字符。复杂排版与长简历仍可能漏项，原文摘录校验不等于语义正确性保证。

## 自动填写

1. 登录招聘网站，展开要填写的区域，打开插件“当前页面”；已有授权的网站会自动识别。首次访问新站点时，点“重新识别”并授权。
2. 有多段经历时，可在“更多填写工具”点“补齐经历条目”：仅在区域明确且有唯一的安全新增按钮时点击，逐次检查新增结果。单类最多处理 10 条；无法识别的区域需要先手动新增。
3. 规则优先识别常见字段。对未对应字段点“AI 补充对应”，模型只收到字段标签、分区、序号和简历字段名称，不收到姓名、电话等简历值及网页已有内容。
4. 每个字段可调整简历来源、内容和勾选状态。低置信度对应不自动勾选。模型自报置信度不等于真实准确率。
5. 点击“填写勾选字段”，检查每个字段的状态和网页实际值。网站可能在输入时自动保存，因此填写即代表向该网站提供所填信息。
6. 页面切换、新增经历、重绘后重新识别。最后的提交申请由本人点击。

支持的控件：

- 文本、长文本、contenteditable、原生 select、原生 date/month。
- 通过 ARIA 或常见 Ant Design / Element 类名关联的下拉菜单；只有唯一精确匹配时选择。
- 搜索式下拉：尝试输入内容并等待匹配选项；无匹配时尝试恢复原值。
- 级联菜单：简历值明确写为“浙江省 / 杭州市 / 西湖区”等逐级路径。中途失败会报告已选择部分内容。
- 只读日期选择器：当前展开日历里存在完整 ISO 日期属性时点击，不按含糊的日数字猜测，也不自动翻日历月份。
- 开放 Shadow DOM、已有授权范围内的 iframe；跨域 iframe、封闭 Shadow DOM 仍有访问限制。

不会点击提交、保存、删除按钮或协议勾选框，不操作密码、验证码和文件上传。新增按钮仅限 type=button 等明确非提交控件。回读、长度限制、网页校验提示用于判断填写结果，但不能证明后端已经保存。

## 免费云 API 备选（2026-11-04 核实）

| 服务 | 适合用途 | 限制 |
| --- | --- | --- |
| Groq Free Plan | 本机结果不满意时，手动切换云端模型 | 按模型和账户限流；保持 Free Plan，具体可用模型及额度看控制台。默认模型 ID 可修改。 |
| OpenRouter 免费模型 | 试用不同模型 | 插件仅允许 openrouter/free 或 :free，并限定输入/输出单价为0；禁用允许数据收集的路由，可能因此无可用提供商。免费模型不保证稳定。 |
| Gemini 免费层 | 不作为本插件的默认简历服务 | 免费条款涉及使用内容改进产品，不建议直接发送含个人信息的完整简历；本版未接入 Gemini。 |

云端模式的解析文字会离开本机。Groq 默认不保留推理内容，但可靠性及滥用调查有例外；OpenRouter 也涉及下游提供商的隐私策略。建议先使用本机方案。没有云端 API Key，因此本次只做了协议模拟测试，没有声称云端实测成功。

官方资料：[Groq Free Plan](https://community.groq.com/t/do-i-get-charged-for-anything-on-the-groq-free-plan/832)、[Groq 额度](https://console.groq.com/docs/rate-limits)、[Groq 数据政策](https://console.groq.com/docs/your-data)、[OpenRouter 限额](https://openrouter.ai/docs/api_reference/limits)、[OpenRouter 数据政策](https://openrouter.ai/docs/guides/privacy/data-collection)、[Gemini 免费条款](https://ai.google.dev/gemini-api/terms)、[Qwen 官方模型](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF)、[llama.cpp](https://github.com/ggml-org/llama.cpp)。

## 验证与边界

- 单元测试覆盖：字段规则、重复经历、API 限流、无效输出、陌生 ID、错误经历索引、原文校验。
- Edge 浏览器测试覆盖：文本/原生下拉、搜索/只读下拉、级联、日期、新增经历、失效节点、已有值保护、不触发提交。
- 真正加载 MV3 扩展后，验证 PDF worker 和 DOCX 在扩展 CSP 下工作。
- 真扩展 → 本机模型 → 草稿 → 确认保存流程已测试。集成测试副本预授予本机权限；发布版需用户点击授权。
- 在本机 i5-12450H、16 GB 内存上，虚构短简历解析约11秒，双教育/双实习简历约16秒，两个语义字段对应约4秒，模型进程约2 GB 工作集。单次样例不是全面准确率或性能保证。
- 未完成登录后的各大厂真实投递页面验证，不能保证所有招聘页面首次就完整适配。

开发者：`npm install`、`npm run build`、`npm test`、`npm run test:browser`、`node tests/extension-smoke.mjs`。本机模型启动后可运行 `node tests/extension-local.mjs`。解析库打包在 vendor 内，不加载 CDN 代码。API Key 保存在 chrome.storage.session，不写入简历导出文件；本机连接文件单独保存。

本版移除了岗位对比界面，专注于简历维护、字段预览和核对后填写。旧版保存的岗位数据未被删除。

## 招聘页面调研（2026-11-04）

| 官方入口 | 公开观察与证据边界 |
| --- | --- |
| [华为完善简历](https://career.huawei.com/cn/personal-center?pageType=editResume&recType=CR) | 本次抓取无法访问，未检查登录后 DOM；[官方 FAQ](https://career.huawei.com/reccampportal/portal5/faq.html)说明官网注册与投递流程。 |
| [腾讯招聘](https://jobs.tencent.com/jobopportunity.html) | 官方检索内容说明登录、上传附件或直接录入；页面抓取没有完整表单内容。 |
| [字节校园投递](https://jobs.bytedance.com/campus/resume/7513773595760429330/apply) | 公开抓取仅返回校园招聘标题，未取得简历字段。 |
| [北森招聘](https://beisen.zhiye.com/campus) | 官方检索显示网申与个人中心流程，抓取没有表单 DOM。 |

这些是入口与流程调研，不是各公司页面结构的完整实测。通用识别属于工程实现方案，不从以上页面推断具体前端框架。

实现参考：[Chrome sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)、[Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)、[Edge sidebar](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/sidebar)。

## 华为校招简历页面实测（2026-11-05）

在已登录的 Edge 正常配置中，打开华为“个人中心 → 校招简历编辑”，安装本版并仅执行“识别当前网页”。识别到 79 个可见控件、40 种字段标签，项目经历区域 25 个控件（5 组项目名称），教育经历区域 12 个控件；1 个控件仍无可用标签。华为使用 `aui-form-item` 与 `*ExperienceModule` 容器，本版据此修正标签和经历分区。未导入真实简历，未点击填写或华为保存按钮，未测试实际写入。页面已填资料可能受招聘流程锁定，不能据此推断可编辑性。
