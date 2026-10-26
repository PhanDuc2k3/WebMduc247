// Fallback illustrations for missing demo product images. Existing product photos are preserved.
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { extraSellers } from './demo-sellers-extra.mjs';

const output = fileURLToPath(new URL('../assets/demo-products/', import.meta.url));
const palettes = [
  ['#fbebf3', '#ae4779', '#e88fb6'], ['#e8f2f6', '#267b91', '#70bac9'],
  ['#fbf0e1', '#ae6b2e', '#eab86c'], ['#ecf0e7', '#59805a', '#a3bd82'],
  ['#eaeafb', '#55539a', '#a5a1dc'], ['#f8ede8', '#a95f4d', '#df9f8c'],
  ['#edf3f0', '#417765', '#84b29b'],
];
const shapes = {
  bottle: '<rect x="150" y="86" width="100" height="26" rx="8"/><rect x="137" y="111" width="126" height="239" rx="28"/><rect class="light" x="155" y="193" width="90" height="93" rx="13"/>',
  jar: '<rect x="109" y="140" width="182" height="34" rx="8"/><rect x="121" y="175" width="158" height="150" rx="20"/><rect class="light" x="139" y="220" width="122" height="62" rx="10"/>',
  tube: '<path d="M143 104h114l-20 232H163z"/><rect x="163" y="333" width="74" height="25" rx="5"/><path class="light" d="M160 152h80l-7 105h-66z"/>',
  dropper: '<rect x="169" y="70" width="62" height="75" rx="18"/><rect x="146" y="144" width="108" height="27" rx="8"/><rect x="129" y="172" width="142" height="169" rx="25"/><circle class="light" cx="200" cy="250" r="42"/>',
  lipstick: '<rect x="164" y="193" width="72" height="139" rx="6"/><rect class="light" x="170" y="261" width="60" height="67"/><path d="M173 184v-80l54-39v119z"/>',
  packet: '<path d="M113 89h174l-9 258H122z"/><path class="light" d="M145 161h110v134H145z"/><path d="M113 89h174v28H113z"/>',
  brush: '<path d="M174 304l15-205h23l14 205z"/><path d="M167 94q32-60 65 0z"/><rect class="light" x="179" y="201" width="43" height="35"/>',
  mat: '<ellipse cx="194" cy="318" rx="135" ry="33"/><path class="light" d="M79 311l180-94 75 25-172 100z"/><ellipse cx="263" cy="230" rx="38" ry="38"/>',
  ball: '<circle cx="200" cy="207" r="133"/><path class="line" d="M91 135q110 33 218 145M118 305q155-106 166-208M70 210h260"/>',
  racket: '<ellipse cx="215" cy="152" rx="89" ry="123"/><path class="line" d="M159 65v174m30-203v232m31-234v232m29-200v171M134 110h163M125 153h180M136 198h157"/><path d="M183 265l-65 116 28 16 65-116z"/>',
  rope: '<path class="line" d="M117 114C25 317 365 353 293 116"/><rect x="95" y="85" width="42" height="89" rx="12"/><rect x="272" y="85" width="42" height="89" rx="12"/>',
  dumbbell: '<path d="M135 188h130v44H135z"/><rect x="86" y="139" width="50" height="143" rx="9"/><rect x="264" y="139" width="50" height="143" rx="9"/><rect x="67" y="169" width="20" height="81" rx="4"/><rect x="313" y="169" width="20" height="81" rx="4"/>',
  band: '<path d="M109 124h182l-37 194H146z"/><path class="light" d="M157 156h86l-14 126h-58z"/>',
  bag: '<path d="M102 157h196l27 170H75z"/><path class="line" d="M149 162v-38a51 51 0 0 1 102 0v38"/><rect class="light" x="132" y="208" width="136" height="78" rx="16"/>',
  roller: '<circle cx="139" cy="208" r="83"/><circle cx="261" cy="208" r="83"/><circle class="light" cx="139" cy="208" r="33"/><circle class="light" cx="261" cy="208" r="33"/><path class="line" d="M132 207h136"/>',
  box: '<path d="M101 112h198v208H101z"/><path class="light" d="M127 153h146v121H127z"/><path d="M101 112l38-29h123l37 29z"/>',
  book: '<path d="M96 78h202v255H108q-23 0-23 18V95q0-17 11-17z"/><path class="light" d="M119 108h151v181H119z"/><path class="line" d="M88 337q8-19 29-19h181M200 120v151"/>',
  cable: '<path class="line" d="M95 109c-35 49-9 88 49 102s101 4 113 48-22 75-80 62"/><rect x="68" y="70" width="53" height="70" rx="9"/><rect x="160" y="292" width="62" height="56" rx="9"/>',
  charger: '<rect x="117" y="130" width="166" height="167" rx="22"/><rect x="149" y="77" width="18" height="54"/><rect x="234" y="77" width="18" height="54"/><path class="light" d="M195 170l-29 50h28l-11 43 50-65h-31l16-28z"/>',
  powerbank: '<rect x="109" y="98" width="182" height="235" rx="25"/><rect class="light" x="129" y="127" width="142" height="169" rx="11"/><rect x="172" y="84" width="56" height="14" rx="3"/>',
  mouse: '<path d="M200 76c-71 0-103 48-103 121v58c0 61 40 98 103 98s103-37 103-98v-58c0-73-32-121-103-121z"/><path class="line" d="M200 77v114m-103 1h206"/><rect class="light" x="188" y="126" width="24" height="50" rx="10"/>',
  camera: '<rect x="75" y="124" width="250" height="169" rx="24"/><circle class="light" cx="200" cy="207" r="62"/><circle cx="200" cy="207" r="27"/><path d="M144 123l23-31h67l23 31z"/>',
  phone: '<rect x="132" y="67" width="136" height="278" rx="25"/><rect class="light" x="144" y="96" width="112" height="218" rx="7"/><circle cx="200" cy="329" r="7"/>',
  card: '<rect x="111" y="81" width="178" height="266" rx="12"/><path class="light" d="M130 162h140v155H130z"/><path class="line" d="M143 108v53m28-53v53m28-53v53m28-53v53m28-53v53"/>',
  hub: '<rect x="99" y="107" width="202" height="230" rx="20"/><rect class="light" x="126" y="140" width="148" height="45" rx="6"/><rect class="light" x="126" y="202" width="148" height="45" rx="6"/><rect class="light" x="126" y="264" width="148" height="45" rx="6"/>',
  lamp: '<path d="M200 58l101 144H99z"/><path class="line" d="M200 203v121M131 332h138"/><circle class="light" cx="200" cy="181" r="29"/>',
  vase: '<path d="M143 78h114v32q-33 31-26 61 8 35 42 90 17 52-17 80H144q-34-28-17-80 34-55 42-90 7-30-26-61z"/><path class="light" d="M153 239h94l13 52H140z"/>',
  pillow: '<path d="M88 103q112 20 224 0 20 112 0 224-112-20-224 0 20-112 0-224z"/><path class="light" d="M122 138q78 10 156 0-10 69 0 155-79-10-156 0 10-83 0-155z"/>',
  candle: '<rect x="122" y="157" width="156" height="176" rx="14"/><path class="light" d="M147 187h106v112H147z"/><path d="M200 60q46 52 0 91-46-39 0-91z"/>',
  clock: '<circle cx="200" cy="207" r="133"/><circle class="light" cx="200" cy="207" r="109"/><path class="line" d="M200 123v84l54 35"/>',
  frame: '<rect x="87" y="80" width="226" height="265" rx="5"/><rect class="light" x="115" y="108" width="170" height="209"/><path d="M129 282l48-60 35 38 38-54 24 76z"/><circle cx="163" cy="164" r="22"/>',
  basket: '<path d="M90 163h220l-26 169H116z"/><path class="line" d="M137 167q0-87 63-87t63 87M156 190v110m44-110v110m44-110v110"/>',
  plant: '<path d="M120 228h160l-24 115H144z"/><path class="line" d="M200 230V83m0 113q-79-82-100-92m100 62q80-88 102-102"/><path d="M101 105q56-26 83 50-54 18-83-50zm201-40q-54-8-84 72 56 10 84-72z"/>',
  tray: '<path d="M72 244h256l-27 84H99z"/><path class="light" d="M104 257h192l-8 28H112z"/><path class="line" d="M72 243q127-56 256 0"/>',
  shoe: '<path d="M62 260q75-10 125-116l45 18q-7 77 105 103l20 70H57z"/><path class="light" d="M66 300h282v27H66z"/><path class="line" d="M155 225l51 20m-36-40 48 18"/>',
  sandal: '<path d="M61 291q60-39 150-29 70 8 128 45v36H61z"/><path class="line" d="M135 255q-22-127 31-143m-4 144q21-140 98-135"/>',
  boot: '<path d="M95 94h133v161q15 27 97 32l23 53H77z"/><path class="light" d="M96 108h113v26H96z"/><path class="line" d="M97 310h244"/>',
  sock: '<path d="M119 81h120v144q26 30 67 28l27 49q-45 60-131 19l-83-56z"/><path class="light" d="M120 90h118v33H120z"/>',
  insole: '<path d="M172 59q74-7 93 70t-22 185q-27 67-91 39-44-23-18-95 21-58 11-111-10-58 27-88z"/><path class="light" d="M177 100q36-7 45 37t-19 114q-19 52-38 43-17-8 2-57 23-64 10-137z"/>',
};
const escapeXml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function wrap(text, width = 27) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const last = lines.length - 1;
    if ((lines[last] + ' ' + word).trim().length > width && lines[last]) lines.push(word);
    else lines[last] = `${lines[last]} ${word}`.trim();
  }
  return lines.slice(0, 3);
}
await mkdir(output, { recursive: true });
let count = 0;
for (const [storeIndex, seller] of extraSellers.entries()) {
  const [background, ink, accent] = palettes[storeIndex];
  for (const [productIndex, product] of seller.products.entries()) {
    const target = new URL(`../assets/demo-products/${product.image}`, import.meta.url);
    if (existsSync(target)) continue;
    const lines = wrap(product.title);
    const title = lines.map((line, index) => `<text x="400" y="${623 + index * 45}" text-anchor="middle" font-family="Arial,sans-serif" font-size="33" font-weight="bold" fill="#203039">${escapeXml(line)}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <rect width="800" height="800" fill="${background}"/>
      <circle cx="400" cy="290" r="250" fill="white" opacity=".75"/>
      <circle cx="680" cy="95" r="95" fill="${accent}" opacity=".2"/>
      <circle cx="92" cy="660" r="145" fill="${accent}" opacity=".15"/>
      <g transform="translate(200 76)" fill="${ink}" stroke="none"><style>.light{fill:${accent}}.line{fill:none;stroke:${ink};stroke-width:13;stroke-linecap:round;stroke-linejoin:round}</style>${shapes[product.icon]}</g>
      <rect x="285" y="551" width="230" height="4" rx="2" fill="${accent}"/>
      ${title}
      <text x="400" y="756" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" letter-spacing="3" fill="${ink}">MDUC247 DEMO  ·  ${String(productIndex + 1).padStart(2, '0')}</text>
    </svg>`;
    await writeFile(target, await sharp(Buffer.from(svg)).png().toBuffer(), { flag: 'wx' });
    count++;
  }
}
console.log(`Generated ${count} missing demo product PNG illustrations in ${output}`);
