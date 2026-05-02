nimAgent 迭代优化计划
当前进度：MVP 核心链路已跑通
已完成：自然语言 → LLM 生成 AnimationSpec → 3级验证 → 代码生成 → Canvas 渲染，完整闭环。支持 OpenAI/DeepSeek/NVIDIA 三套模型、中英双语、流式响应、Agent Inspector、Demo 降级。

核心缺口：沙箱是占位的、无播放控制、Canvas 固定尺寸、0 测试、动画只有导数一种真正可用。

产品经理视角
Sprint 1：体验闭环 (1周)
优先级	功能	原因
P0	播放/暂停/重播/进度拖拽	产品规范 US-2 的核心验收标准，学生需要反复看
P0	Canvas 自适应容器尺寸	当前 680×420 硬编码，Mac 不同窗口大小体验差
P0	生成等待骨架屏 + 预估倒计时	8s 等待焦虑缓解
P1	示例提示词跟随语言切换	中文用户看到英文示例会困惑
P1	ErrorBoundary 错误卡片	Agent 失败时避免白屏
Sprint 2：动画能力扩展 (2周)
优先级	功能	原因
P0	积分动画（黎曼矩形+面积填充）	覆盖 AP 微积分 25% 题型
P0	极限动画 drawLimitApproach	极限是微积分入门概念
P1	动画模板库，预置 10+ 高质量 Spec	新用户零输入即可体验价值
P1	动画历史 localStorage 存最近 10 条	US-4 验收标准
P2	生成动画 URL 可分享	社交传播
Sprint 3：智能化 (2周)
优先级	功能	原因
P0	TTS 语音旁白 (OpenAI TTS / Edge TTS)	"老师讲课" 核心体验
P1	教学三段式模板（引入→演示→总结）	提升教学效果
P1	动态少样本匹配	Pass@1 提升至 85%+
P2	播放后满意度评分	质量评估闭环
Sprint 4：导出与商业化 (3周)
优先级	功能	原因
P0	Remotion MP4 视频导出	用户可下载分享到社交平台
P1	用户账户系统	付费基础设施
P1	移动端响应式	50%+ 学生用手机
软件开发视角
Sprint 1：工程基础加固 (1周)
优先级	任务	方案
P0	真沙箱执行	Web Worker + postMessage 隔离，替换 simulateExecution() 字符串检查
P0	Canvas 响应式	ResizeObserver + devicePixelRatio 适配 Retina
P0	ErrorBoundary	包裹动画组件 + App 顶层
P1	测试骨架	Vitest 覆盖 validator.ts、codeGenerator.ts、evalExpr()
P1	API 超时分级	区分网络/LLM/流式超时，前端精确状态展示
Sprint 2：渲染引擎升级 (2周)
优先级	任务	方案
P0	通用 Spec 渲染器	抽离为 SpecRenderer，工具通过注册表动态调度，废弃硬编码 DerivativeAnimation
P0	播放控制器 Hook	useAnimationController(spec) → play/pause/seek/speed，独立于渲染
P1	缓动函数	easeInOutCubic 替换线性 progress
P1	Canvas 分层	网格层/曲线层/标注层分离，避免每帧全量重绘
P2	OffscreenCanvas	渲染移出主线程
Sprint 3：AI 能力增强 (2周)
优先级	任务	方案
P0	LLM Streaming	OpenAI Streaming API，边接收边展示 JSON 构建
P0	mathjs 语义验证	用 mathjs AST 验证数学正确性（依赖已装但未用）
P1	CoT 规划	Agent 先输出 internal_monologue，再输出 Spec
P1	Prompt 版本管理	提示词配置化 JSON/YAML，支持 A/B Test
P2	视觉评审	关键帧截图 → GPT-4o-Vision 评审构图
Sprint 4：生产化 (3周)
优先级	任务	方案
P0	Remotion 集成	Server-side @remotion/renderer 渲染 MP4
P0	性能监控	OpenTelemetry 追踪 LLM 延迟/Pass@1/Token 消耗
P1	部署优化	Vercel Edge + ISR + CDN
P1	Rate Limiting	IP 级请求限制
P2	微调数据管道	成功的 (input, spec) 对存 SQLite → 导出微调数据集
