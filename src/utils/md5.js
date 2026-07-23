/**
 * 纯 JS 实现 RFC 1321 标准 MD5，无第三方依赖
 * 输入 UTF-8 字符串，输出 32 位小写十六进制哈希
 */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

// 标准 MD5 常量 T[i] = floor(abs(sin(i+1)) * 2^32)
const T = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

function toUint32(x) {
  return x >>> 0;
}

function safeAdd(x, y) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return toUint32((msw << 16) | (lsw & 0xffff));
}

function rol(num, cnt) {
  return toUint32((num << cnt) | (num >>> (32 - cnt)));
}

function strToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return bytes;
}

function bytesToWords(bytes) {
  const words = new Array(Math.ceil(bytes.length / 4));
  for (let i = 0; i < words.length; i++) words[i] = 0;
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  for (let i = 0; i < words.length; i++) words[i] = toUint32(words[i]);
  return words;
}

function wordsToHex(words) {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < words.length * 4; i++) {
    const v = (words[i >> 2] >> ((i % 4) * 8)) & 0xff;
    out += hex.charAt((v >> 4) & 0xf) + hex.charAt(v & 0xf);
  }
  return out;
}

/** 计算字符串的 MD5，返回 32 位小写十六进制 */
export function md5(str) {
  const bytes = strToBytes(String(str));
  const origLen = bytes.length;

  // 填充: 0x80 后补 0 至 length % 64 == 56，再追加 8 字节长度
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const lenBits = toUint32(origLen) * 8;
  const lenWords = [toUint32(lenBits), 0];
  for (let i = 0; i < 2; i++) {
    for (let b = 0; b < 4; b++) {
      bytes.push((lenWords[i] >> (8 * b)) & 0xff);
    }
  }

  const x = bytesToWords(bytes);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  for (let i = 0; i < x.length; i += 16) {
    const aa = a, bb = b, cc = c, dd = d;

    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      b = safeAdd(b, rol(safeAdd(safeAdd(safeAdd(a, f), T[j]), x[i + g]), S[j]));
      a = tmp;
    }

    a = safeAdd(a, aa);
    b = safeAdd(b, bb);
    c = safeAdd(c, cc);
    d = safeAdd(d, dd);
  }

  return wordsToHex([a, b, c, d]);
}

export default md5;
