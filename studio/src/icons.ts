import fontCSS from '../../static/icon/font.css?raw';
import sprite from '../../static/img/icons/sprite.svg?raw';
import spriteURL from '../../static/img/icons/sprite.svg?url';
export { spriteURL };
export const glyphs = new Map([...fontCSS.matchAll(/\.(icon-[\w-]+):before\s*\{\s*content:\s*"\\([\da-fA-F]+)"/g)].map(match => [match[1], String.fromCodePoint(parseInt(match[2], 16))]));
export const iconChoices = [...glyphs.keys()].map(value => ({ value, label: value.slice(5).replaceAll('-', ' ') }));
export const symbolChoices = [...sprite.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map(match => ({ value: match[1], label: match[1] }));
export const emojiChoices = ['😀','😊','😎','🥰','🤖','💡','✨','🌟','🔥','❤️','🎉','📚','✍️','💻','🔬','🎵','🎸','🎨','🏠','🌍','🚀','🌱','☕','🐱','🐶','🏃','🤝','🔍'].map(value => ({ value, label: value }));
