import {markdownToBlocks} from '../src/index';

describe('Heading Colors', () => {
  it('should set heading colors correctly for h1-h6', () => {
    const markdown = `
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
    `;

    const blocks = markdownToBlocks(markdown, {
      headingColors: {
        h1: 'red',
        h2: 'yellow',
        h3: 'blue',
        h4: 'green',
        h5: 'purple',
        h6: 'gray',
      },
    });

    // 使用类型断言访问标题块属性
    // 检查一级标题颜色
    expect(blocks[0].type).toBe('heading_1');
    expect((blocks[0] as any).heading_1.rich_text[0].annotations.color).toBe(
      'red'
    );

    // 检查二级标题颜色
    expect(blocks[1].type).toBe('heading_2');
    expect((blocks[1] as any).heading_2.rich_text[0].annotations.color).toBe(
      'yellow'
    );

    // 检查三级标题颜色
    expect(blocks[2].type).toBe('heading_3');
    expect((blocks[2] as any).heading_3.rich_text[0].annotations.color).toBe(
      'blue'
    );

    // 注意：h4-h6 在 Notion 中都会被转换为 h3
    // 检查四级标题颜色
    expect(blocks[3].type).toBe('heading_3');
    expect((blocks[3] as any).heading_3.rich_text[0].annotations.color).toBe(
      'green'
    );

    // 检查五级标题颜色
    expect(blocks[4].type).toBe('heading_3');
    expect((blocks[4] as any).heading_3.rich_text[0].annotations.color).toBe(
      'purple'
    );

    // 检查六级标题颜色
    expect(blocks[5].type).toBe('heading_3');
    expect((blocks[5] as any).heading_3.rich_text[0].annotations.color).toBe(
      'gray'
    );
  });

  it('should handle partial heading colors', () => {
    const markdown = `
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
    `;

    const blocks = markdownToBlocks(markdown, {
      headingColors: {
        h1: 'red',
        // h2 没有设置颜色
        h3: 'blue',
        // h4 没有设置颜色
        h5: 'purple',
        // h6 没有设置颜色
      },
    });

    // 使用类型断言访问标题块属性
    // 检查一级标题颜色
    expect(blocks[0].type).toBe('heading_1');
    expect((blocks[0] as any).heading_1.rich_text[0].annotations.color).toBe(
      'red'
    );

    // 检查二级标题颜色 (应该是默认颜色)
    expect(blocks[1].type).toBe('heading_2');
    expect((blocks[1] as any).heading_2.rich_text[0].annotations.color).toBe(
      'default'
    );

    // 检查三级标题颜色
    expect(blocks[2].type).toBe('heading_3');
    expect((blocks[2] as any).heading_3.rich_text[0].annotations.color).toBe(
      'blue'
    );

    // 检查四级标题颜色 (应该是默认颜色)
    expect(blocks[3].type).toBe('heading_3');
    expect((blocks[3] as any).heading_3.rich_text[0].annotations.color).toBe(
      'default'
    );

    // 检查五级标题颜色
    expect(blocks[4].type).toBe('heading_3');
    expect((blocks[4] as any).heading_3.rich_text[0].annotations.color).toBe(
      'purple'
    );

    // 检查六级标题颜色 (应该是默认颜色)
    expect(blocks[5].type).toBe('heading_3');
    expect((blocks[5] as any).heading_3.rich_text[0].annotations.color).toBe(
      'default'
    );
  });

  it('should convert hex colors to Notion colors', () => {
    const markdown = `
# 一级标题
## 二级标题
### 三级标题
    `;

    const blocks = markdownToBlocks(markdown, {
      headingColors: {
        h1: '#FF6F61', // 应该映射到 red
        h2: '#F8B400', // 应该映射到 yellow
        h3: '#4DB8FF', // 应该映射到 blue
      },
    });

    // 检查一级标题颜色
    expect(blocks[0].type).toBe('heading_1');
    expect((blocks[0] as any).heading_1.rich_text[0].annotations.color).toBe(
      'red'
    );

    // 检查二级标题颜色
    expect(blocks[1].type).toBe('heading_2');
    expect((blocks[1] as any).heading_2.rich_text[0].annotations.color).toBe(
      'yellow'
    );

    // 检查三级标题颜色
    expect(blocks[2].type).toBe('heading_3');
    expect((blocks[2] as any).heading_3.rich_text[0].annotations.color).toBe(
      'blue'
    );
  });

  it('should use default heading colors when enabled', () => {
    const markdown = `
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
    `;

    const blocks = markdownToBlocks(markdown, {
      useDefaultHeadingColors: true,
    });

    // 检查一级标题颜色 (#FF6F61 -> red)
    expect(blocks[0].type).toBe('heading_1');
    expect((blocks[0] as any).heading_1.rich_text[0].annotations.color).toBe(
      'red'
    );

    // 检查二级标题颜色 (#F8B400 -> yellow)
    expect(blocks[1].type).toBe('heading_2');
    expect((blocks[1] as any).heading_2.rich_text[0].annotations.color).toBe(
      'yellow'
    );

    // 检查三级标题颜色 (#4DB8FF -> blue)
    expect(blocks[2].type).toBe('heading_3');
    expect((blocks[2] as any).heading_3.rich_text[0].annotations.color).toBe(
      'blue'
    );

    // 检查四级标题颜色 (#A3BE8C -> green)
    expect(blocks[3].type).toBe('heading_3');
    expect((blocks[3] as any).heading_3.rich_text[0].annotations.color).toBe(
      'green'
    );

    // 检查五级标题颜色 (#B48EAD -> purple)
    expect(blocks[4].type).toBe('heading_3');
    expect((blocks[4] as any).heading_3.rich_text[0].annotations.color).toBe(
      'purple'
    );

    // 检查六级标题颜色 (#5E81AC -> blue)
    expect(blocks[5].type).toBe('heading_3');
    expect((blocks[5] as any).heading_3.rich_text[0].annotations.color).toBe(
      'blue'
    );
  });
});
