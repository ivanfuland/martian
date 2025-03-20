const {markdownToBlocks} = require('../build/src/index');

// 示例 Markdown 内容
const markdown = `
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
`;

// 示例 1: 使用自定义颜色设置
console.log('示例 1: 使用自定义颜色设置');
const blocks1 = markdownToBlocks(markdown, {
  headingColors: {
    h1: 'red', // 一级标题设置为红色
    h2: 'yellow', // 二级标题设置为黄色
    h3: 'blue', // 三级标题设置为蓝色
    h4: 'green', // 四级标题设置为绿色
    h5: 'purple', // 五级标题设置为紫色
    h6: 'gray', // 六级标题设置为灰色
  },
});
console.log(JSON.stringify(blocks1, null, 2));

// 示例 2: 使用十六进制颜色代码（会自动映射到最接近的 Notion 颜色）
console.log('\n示例 2: 使用十六进制颜色代码');
const blocks2 = markdownToBlocks(markdown, {
  headingColors: {
    h1: '#FF6F61', // 映射到 red
    h2: '#F8B400', // 映射到 yellow
    h3: '#4DB8FF', // 映射到 blue
    h4: '#A3BE8C', // 映射到 green
    h5: '#B48EAD', // 映射到 purple
    h6: '#5E81AC', // 映射到 blue
  },
});
console.log(JSON.stringify(blocks2, null, 2));

// 示例 3: 使用默认颜色设置
console.log('\n示例 3: 使用默认颜色设置');
const blocks3 = markdownToBlocks(markdown, {
  useDefaultHeadingColors: true,
});
console.log(JSON.stringify(blocks3, null, 2));

console.log('--------------------------------');

const blocks4 = markdownToBlocks(markdown);
console.log(JSON.stringify(blocks4, null, 2));

// 可用的颜色值:
// default, gray, brown, orange, yellow, green, blue, purple, pink, red
// 以及带背景的颜色:
// gray_background, brown_background, orange_background, yellow_background,
// green_background, blue_background, purple_background, pink_background, red_background
