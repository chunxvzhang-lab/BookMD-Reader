# 进阶 Markdown

本章用于验证用户通常期待 Markdown 阅读器支持的渲染行为。

## 任务列表

- [x] 渲染标题和段落
- [x] 渲染任务列表
- [x] 高亮代码
- [ ] 后续打包为原生桌面外壳

## 代码块

```ts
type Bookmark = {
  chapterId: string;
  headingId?: string;
  scrollRatio: number;
  excerpt: string;
};
```

## 相对图片

内置书籍可以包含相对图片和链接。下面这个标记来自章节目录下的相对路径：

![阅读标记](media/reading-marker.svg)

你也可以链接到同级章节文件，例如[欢迎章节](01-welcome.md)。

## 外部链接

外部链接，例如 [GitHub](https://github.com/)，会在新标签页中打开。

## 最终检查点

在这里设置书签，用来验证章节靠后位置的跳转。
