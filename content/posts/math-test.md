---
title: 在博客里写公式
description: 用 KaTeX 在 Markdown 里写行内与块级数学公式：语法、排版约定、以及写错时的表现。
date: 2025-11-07
category: 写作
tags: [数学, KaTeX, 排版]
---

这篇文章既是公式写法的说明，也是排版回归的固定样本 —— 站点的公式门禁
（`scripts/verify-math.mjs`）会拿它量字号、间距、横向滚动与配色。

## 行内公式

质能方程 $E = mc^2$ 说明质量与能量等价；勾股定理写成 $a^2 + b^2 = c^2$。
行内公式夹在中文里时基线要对齐：这里的 $x_i$、$\sum_{i=1}^{n} x_i$ 与 $\frac{a}{b}$
都贴着汉字，行距不该被撑开。

上下标与根式：$f(x) = \sqrt[3]{x^2 + 1}$，希腊字母 $\alpha \beta \gamma \Delta \Omega$。

## 块级公式

用两个美元符号包住，独立成行，水平居中：

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

$$
\int_{0}^{\infty} e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
$$

矩阵与分段函数：

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}
\begin{bmatrix} x \\ y \end{bmatrix}
= \begin{bmatrix} ax + by \\ cx + dy \end{bmatrix}
$$

$$
f(x) = \begin{cases}
  x^2 & x \ge 0 \\
  -x  & x < 0
\end{cases}
$$

## 另一种块级写法

也可以用 `math` 围栏，效果与美元符号一致：

```math
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
```

## 公式里的中文

用 `\text{}` 包住中文，不必退回正文写法：

$$
\text{课程绩点} = \frac{\text{课程分数}}{10} - 5
$$

$$
P(A \mid B) = \frac{P(B \mid A) \, P(A)}{P(B)}
$$

## 长公式

超宽的公式在窄屏上局部横向滚动，不撑破页面：

$$
\frac{\partial}{\partial t} \iiint_{\Omega} \rho \, dV + \iint_{\partial \Omega} \rho \mathbf{v} \cdot d\mathbf{S} = \sum_{k=1}^{m} \frac{\alpha_k \beta_k \gamma_k}{\delta_k + \varepsilon_k} - \prod_{j=1}^{n} \left( 1 - \frac{\lambda_j}{\mu_j} \right)
$$

## 转义与写错

正文里要出现美元符号本身，用反斜杠转义：\$100 与 \$200 都是普通文本。

语法写错时只会标红那一处，不会让整页渲染失败：

$$
\frac{1}{
$$
