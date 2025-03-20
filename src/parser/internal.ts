import * as md from '../markdown';
import * as notion from '../notion';
import path from 'path';
import {URL} from 'url';
import {isSupportedCodeLang, LIMITS} from '../notion';

function ensureLength(text: string, copy?: object) {
  const chunks = text.match(/[^]{1,2000}/g) || [];
  return chunks.flatMap((item: string) => notion.richText(item, copy));
}

function ensureCodeBlockLanguage(lang?: string) {
  if (lang) {
    lang = lang.toLowerCase();
    return isSupportedCodeLang(lang) ? lang : notion.parseCodeLanguage(lang);
  }

  return undefined;
}

function parseInline(
  element: md.PhrasingContent,
  options?: notion.RichTextOptions
): notion.RichText[] {
  const copy = {
    annotations: {
      ...(options?.annotations ?? {}),
    },
    url: options?.url,
  };

  switch (element.type) {
    case 'text':
      return ensureLength(element.value, copy);

    case 'delete':
      copy.annotations.strikethrough = true;
      return element.children.flatMap(child => parseInline(child, copy));

    case 'emphasis':
      copy.annotations.italic = true;
      return element.children.flatMap(child => parseInline(child, copy));

    case 'strong':
      copy.annotations.bold = true;
      return element.children.flatMap(child => parseInline(child, copy));

    case 'link':
      copy.url = element.url;
      return element.children.flatMap(child => parseInline(child, copy));

    case 'inlineCode':
      copy.annotations.code = true;
      return [notion.richText(element.value, copy)];

    case 'inlineMath':
      return [notion.richText(element.value, {...copy, type: 'equation'})];

    default:
      return [];
  }
}

function parseImage(image: md.Image, options: BlocksOptions): notion.Block {
  // https://developers.notion.com/reference/block#image-blocks
  const allowedTypes = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.tif',
    '.tiff',
    '.bmp',
    '.svg',
    '.heic',
    '.webp',
  ];

  function dealWithError() {
    return notion.paragraph([notion.richText(image.url)]);
  }

  try {
    if (options.strictImageUrls ?? true) {
      const parsedUrl = new URL(image.url);
      const fileType = path.extname(parsedUrl.pathname);
      if (allowedTypes.includes(fileType)) {
        return notion.image(image.url);
      } else {
        return dealWithError();
      }
    } else {
      return notion.image(image.url);
    }
  } catch (error: unknown) {
    return dealWithError();
  }
}

function parseParagraph(
  element: md.Paragraph,
  options: BlocksOptions
): notion.Block[] {
  // Paragraphs can also be legacy 'TOC' from some markdown, so we check first
  const mightBeToc =
    element.children.length > 2 &&
    element.children[0].type === 'text' &&
    element.children[0].value === '[[' &&
    element.children[1].type === 'emphasis';
  if (mightBeToc) {
    const emphasisItem = element.children[1] as md.Emphasis;
    const emphasisTextItem = emphasisItem.children[0] as md.Text;
    if (emphasisTextItem.value === 'TOC') {
      return [notion.table_of_contents()];
    }
  }

  // Notion doesn't deal with inline images, so we need to parse them all out
  // of the paragraph into individual blocks
  const images: notion.Block[] = [];
  const paragraphs: Array<notion.RichText[]> = [];
  element.children.forEach(item => {
    if (item.type === 'image') {
      images.push(parseImage(item, options));
    } else {
      const richText = parseInline(item) as notion.RichText[];
      if (richText.length) {
        paragraphs.push(richText);
      }
    }
  });

  if (paragraphs.length) {
    return [notion.paragraph(paragraphs.flat()), ...images];
  } else {
    return images;
  }
}

function parseBlockquote(
  element: md.Blockquote,
  options: BlocksOptions
): notion.Block {
  const children = element.children.flatMap(child => parseNode(child, options));
  return notion.blockquote([], children);
}

// 将十六进制颜色代码映射到最接近的 Notion 颜色
function mapHexToNotionColor(hexColor: string): string {
  // 如果输入的颜色已经是 Notion 颜色名称，直接返回
  const validNotionColors = [
    'default',
    'gray',
    'brown',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'red',
    'gray_background',
    'brown_background',
    'orange_background',
    'yellow_background',
    'green_background',
    'blue_background',
    'purple_background',
    'pink_background',
    'red_background',
  ];

  if (validNotionColors.includes(hexColor)) {
    return hexColor;
  }

  // 预定义的颜色映射
  const predefinedMappings: Record<string, string> = {
    '#FF6F61': 'red', // h1
    '#F8B400': 'yellow', // h2
    '#4DB8FF': 'blue', // h3
    '#A3BE8C': 'green', // h4
    '#B48EAD': 'purple', // h5
    '#5E81AC': 'blue', // h6
  };

  // 检查是否有预定义的映射
  if (predefinedMappings[hexColor]) {
    return predefinedMappings[hexColor];
  }

  // Notion 支持的颜色及其十六进制值
  const notionColors: Record<string, string> = {
    default: '#37352F',
    gray: '#9B9A97',
    brown: '#64473A',
    orange: '#D9730D',
    yellow: '#DFAB01',
    green: '#0F7B6C',
    blue: '#0B6E99',
    purple: '#6940A5',
    pink: '#AD1A72',
    red: '#E03E3E',
  };

  // 将十六进制颜色转换为 RGB
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);

  // 计算与 Notion 颜色的距离，找到最接近的颜色
  let minDistance = Infinity;
  let closestColor = 'default';

  for (const [colorName, colorHex] of Object.entries(notionColors)) {
    const nr = parseInt(colorHex.substring(1, 3), 16);
    const ng = parseInt(colorHex.substring(3, 5), 16);
    const nb = parseInt(colorHex.substring(5, 7), 16);

    // 使用欧几里得距离计算颜色相似度
    const distance = Math.sqrt(
      Math.pow(r - nr, 2) + Math.pow(g - ng, 2) + Math.pow(b - nb, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = colorName;
    }
  }

  return closestColor;
}

// 获取标题的默认颜色
function getDefaultHeadingColor(depth: number): string {
  // 默认的标题颜色（十六进制）
  const defaultColors: Record<string, string> = {
    '1': '#FF6F61', // h1: 红色
    '2': '#F8B400', // h2: 黄色
    '3': '#4DB8FF', // h3: 蓝色
    '4': '#A3BE8C', // h4: 绿色
    '5': '#B48EAD', // h5: 紫色
    '6': '#5E81AC', // h6: 深蓝色
  };

  // 将十六进制颜色映射到 Notion 颜色
  const hexColor = defaultColors[depth.toString()] || defaultColors['1'];
  return mapHexToNotionColor(hexColor);
}

function parseHeading(
  element: md.Heading,
  options: BlocksOptions
): notion.Block {
  const text = element.children.flatMap(child => parseInline(child));

  // 应用标题颜色设置
  let color: string | undefined;

  // 如果设置了 headingColors，尝试获取对应的颜色
  if (options.headingColors) {
    const colorKey = `h${element.depth}` as keyof typeof options.headingColors;
    color = options.headingColors[colorKey];
  }

  // 如果没有指定颜色，但启用了默认颜色，使用默认颜色
  if (!color && options.useDefaultHeadingColors) {
    color = getDefaultHeadingColor(element.depth);
  }

  if (color) {
    // 有效的 Notion 颜色值
    const validColors = [
      'default',
      'gray',
      'brown',
      'orange',
      'yellow',
      'green',
      'blue',
      'purple',
      'pink',
      'red',
      'gray_background',
      'brown_background',
      'orange_background',
      'yellow_background',
      'green_background',
      'blue_background',
      'purple_background',
      'pink_background',
      'red_background',
    ];

    // 如果是十六进制颜色，转换为 Notion 颜色
    let notionColor = color;
    if (color.startsWith('#')) {
      notionColor = mapHexToNotionColor(color);
    }

    // 检查颜色值是否有效
    if (validColors.includes(notionColor)) {
      // 为所有 RichText 元素设置颜色
      text.forEach(rt => {
        if (rt.annotations) {
          rt.annotations.color = notionColor as any; // 使用 any 类型暂时绕过类型检查
        }
      });
    }
  }

  switch (element.depth) {
    case 1:
      return notion.headingOne(text);

    case 2:
      return notion.headingTwo(text);

    default:
      return notion.headingThree(text);
  }
}

function parseCode(element: md.Code): notion.Block {
  const text = ensureLength(element.value);
  const lang = ensureCodeBlockLanguage(element.lang);
  return notion.code(text, lang);
}

function parseList(element: md.List, options: BlocksOptions): notion.Block[] {
  return element.children.flatMap(item => {
    const paragraph = item.children.shift();
    if (paragraph === undefined || paragraph.type !== 'paragraph') {
      return [] as notion.Block[];
    }

    const text = paragraph.children.flatMap(child => parseInline(child));

    // Now process any of the children
    const parsedChildren: notion.BlockWithoutChildren[] = item.children.flatMap(
      child =>
        parseNode(child, options) as unknown as notion.BlockWithoutChildren
    );

    if (element.start !== null && element.start !== undefined) {
      return [notion.numberedListItem(text, parsedChildren)];
    } else if (item.checked !== null && item.checked !== undefined) {
      return [notion.toDo(item.checked, text, parsedChildren)];
    } else {
      return [notion.bulletedListItem(text, parsedChildren)];
    }
  });
}

function parseTableCell(node: md.TableCell): notion.RichText[][] {
  return [node.children.flatMap(child => parseInline(child))];
}

function parseTableRow(node: md.TableRow): notion.BlockWithoutChildren[] {
  const tableCells = node.children.flatMap(child => parseTableCell(child));
  return [notion.tableRow(tableCells)];
}

function parseTable(node: md.Table): notion.Block[] {
  // The width of the table is the amount of cells in the first row, as all rows must have the same number of cells
  const tableWidth = node.children?.length
    ? node.children[0].children.length
    : 0;

  const tableRows = node.children.flatMap(child => parseTableRow(child));
  return [notion.table(tableRows, tableWidth)];
}

function parseMath(node: md.Math): notion.Block {
  const textWithKatexNewlines = node.value.split('\n').join('\\\\\n');
  return notion.equation(textWithKatexNewlines);
}

function parseNode(
  node: md.FlowContent,
  options: BlocksOptions
): notion.Block[] {
  switch (node.type) {
    case 'heading':
      return [parseHeading(node, options)];

    case 'paragraph':
      return parseParagraph(node, options);

    case 'code':
      return [parseCode(node)];

    case 'blockquote':
      return [parseBlockquote(node, options)];

    case 'list':
      return parseList(node, options);

    case 'table':
      return parseTable(node);

    case 'math':
      return [parseMath(node)];

    case 'thematicBreak':
      return [notion.divider()];

    default:
      return [];
  }
}

/** Options common to all methods. */
export interface CommonOptions {
  /**
   * Define how to behave when an item exceeds the Notion's request limits.
   * @see https://developers.notion.com/reference/request-limits#limits-for-property-values
   */
  notionLimits?: {
    /**
     * Whether the excess items or characters should be automatically truncated where possible.
     * If set to `false`, the resulting item will not be compliant with Notion's limits.
     * Please note that text will be truncated only if the parser is not able to resolve
     * the issue in any other way.
     */
    truncate?: boolean;
    /** The callback for when an item exceeds Notion's limits. */
    onError?: (err: Error) => void;
  };
}

export interface BlocksOptions extends CommonOptions {
  /** Whether to render invalid images as text */
  strictImageUrls?: boolean;
  /**
   * 设置标题颜色
   * 可用颜色: default, gray, brown, orange, yellow, green, blue, purple, pink, red
   * 以及带背景的颜色: gray_background, brown_background, orange_background,
   * yellow_background, green_background, blue_background, purple_background,
   * pink_background, red_background
   *
   * 也可以使用十六进制颜色代码，会自动映射到最接近的 Notion 颜色
   */
  headingColors?: {
    h1?: string;
    h2?: string;
    h3?: string;
    h4?: string;
    h5?: string;
    h6?: string;
  };
  /**
   * 是否使用默认的标题颜色
   * 默认颜色:
   * h1: #FF6F61 (红色)
   * h2: #F8B400 (黄色)
   * h3: #4DB8FF (蓝色)
   * h4: #A3BE8C (绿色)
   * h5: #B48EAD (紫色)
   * h6: #5E81AC (深蓝色)
   */
  useDefaultHeadingColors?: boolean;
}

export function parseBlocks(
  root: md.Root,
  options?: BlocksOptions
): notion.Block[] {
  // 确保 options 对象存在
  const opts: BlocksOptions = options || {};

  // 打印 options 对象，用于调试
  console.log('Options:', JSON.stringify(opts, null, 2));

  const parsed = root.children.flatMap(item => parseNode(item, opts));

  const truncate = !!(opts.notionLimits?.truncate ?? true),
    limitCallback = opts.notionLimits?.onError ?? (() => {});

  if (parsed.length > LIMITS.PAYLOAD_BLOCKS)
    limitCallback(
      new Error(
        `Resulting blocks array exceeds Notion limit (${LIMITS.PAYLOAD_BLOCKS})`
      )
    );

  return truncate ? parsed.slice(0, LIMITS.PAYLOAD_BLOCKS) : parsed;
}

export interface RichTextOptions extends CommonOptions {
  /**
   * How to behave when a non-inline element is detected:
   * - `ignore` (default): skip to the next element
   * - `throw`: throw an error
   */
  nonInline?: 'ignore' | 'throw';
}

export function parseRichText(
  root: md.Root,
  options?: RichTextOptions
): notion.RichText[] {
  const richTexts: notion.RichText[] = [];

  root.children.forEach(child => {
    if (child.type === 'paragraph')
      child.children.forEach(child => richTexts.push(...parseInline(child)));
    else if (options?.nonInline === 'throw')
      throw new Error(`Unsupported markdown element: ${JSON.stringify(child)}`);
  });

  const truncate = !!(options?.notionLimits?.truncate ?? true),
    limitCallback = options?.notionLimits?.onError ?? (() => {});

  if (richTexts.length > LIMITS.RICH_TEXT_ARRAYS)
    limitCallback(
      new Error(
        `Resulting richTexts array exceeds Notion limit (${LIMITS.RICH_TEXT_ARRAYS})`
      )
    );

  return (
    truncate ? richTexts.slice(0, LIMITS.RICH_TEXT_ARRAYS) : richTexts
  ).map(rt => {
    if (rt.type !== 'text') return rt;

    if (rt.text.content.length > LIMITS.RICH_TEXT.TEXT_CONTENT) {
      limitCallback(
        new Error(
          `Resulting text content exceeds Notion limit (${LIMITS.RICH_TEXT.TEXT_CONTENT})`
        )
      );
      if (truncate)
        rt.text.content =
          rt.text.content.slice(0, LIMITS.RICH_TEXT.TEXT_CONTENT - 3) + '...';
    }

    if (
      rt.text.link?.url &&
      rt.text.link.url.length > LIMITS.RICH_TEXT.LINK_URL
    )
      // There's no point in truncating URLs
      limitCallback(
        new Error(
          `Resulting text URL exceeds Notion limit (${LIMITS.RICH_TEXT.LINK_URL})`
        )
      );

    // Notion equations are not supported by this library, since they don't exist in Markdown

    return rt;
  });
}
