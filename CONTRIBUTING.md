# 贡献指南

感谢您对 MCP-HUB 项目的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 1. 报告问题

如果您发现了 bug 或有功能建议，请通过 GitHub Issues 报告：

1. 检查是否已有类似 issue
2. 提供详细的复现步骤
3. 附上相关日志和错误信息
4. 说明您的环境（OS、Python 版本等）

### 2. 提交代码

#### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate    # Windows

# 安装开发依赖
pip install pytest pytest-cov black isort flake8 mypy
```

#### 代码规范

- **格式化**: 使用 black (`black .`)
- **导入排序**: 使用 isort (`isort .`)
- **类型注解**: 所有函数添加类型注解
- **文档字符串**: 公共 API 添加 docstring

#### 提交流程

1. **Fork 仓库** 并创建分支
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **编写代码** 并添加测试

3. **运行测试**
   ```bash
   pytest tests/ -v
   ```

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `refactor:` 代码重构
   - `test:` 测试相关
   - `chore:` 构建/工具

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### 3. 代码审查

所有 PR 都需要通过：
- 代码审查
- CI 测试通过
- 无安全漏洞

## 项目结构

```
MCP-HUB/
├── core/              # 核心框架
├── tools/             # 工具脚本
├── tests/             # 测试代码
├── examples/          # 配置示例
├── universal-adapter/ # 通用适配器
└── .github/           # CI/CD 配置
```

## 添加新的 MCP 服务器

使用统一下载器：
```bash
python tools/downloader.py awesome 10
```

或手动添加到 `servers/` 目录。

## 行为准则

- 尊重他人，友善交流
- 接受建设性批评
- 关注社区利益

## 许可证

通过提交代码，您同意您的贡献将在 MIT 许可证下发布。
