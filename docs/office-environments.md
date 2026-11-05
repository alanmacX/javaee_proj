# 办公空间照片

两张照片随前端打包，本地加载；设置里的办公空间选择保存在浏览器中。初始场景为窗边会议室。

| 场景 | 本地文件 | 来源 |
| --- | --- | --- |
| 窗边会议室 | `frontend/public/environments/office-lounge.jpg` | [Unsplash 原始图片](https://images.unsplash.com/photo-1497366811353-6870744d04b2) |
| 玻璃办公区 | `frontend/public/environments/office-loft.jpg` | [Unsplash 原始图片](https://images.unsplash.com/photo-1497366754035-f200968a6e72) |

图片使用条款：[Unsplash License](https://unsplash.com/license)。项目保留下载后的实拍照片，CSS 只调整环境遮罩、裁切位置和界面玻璃层。

## 层级

- `environment` 是唯一的全屏背景，固定在窗口后；照片加载失败时仍有环境渐变底色。
- `scene-image`、`scene-position`、`scene-tone` 控制环境；浅深色使用同一张照片并分别调整遮罩。
- 主窗口用 `material-window` 与 `filter-window-frame` 采样照片；边缘只使用一层 `material-window-rim`。
- 导航采用更薄的模糊层，输入区单独使用 `material-composer`，弹窗使用更厚的 `material-sheet`。
- 窄屏保留全屏阅读区域与浮动控件；减少透明度偏好和不支持 backdrop-filter 的环境使用更厚底色。
