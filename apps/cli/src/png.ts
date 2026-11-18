import { Resvg } from '@resvg/resvg-js';

const MM_PER_INCH = 25.4;

/** Render an SVG whose width is in mm to a transparent PNG at `dpi`. */
export function svgToPng(svg: string, widthMm: number, dpi: number): Buffer {
	const width = Math.round((widthMm / MM_PER_INCH) * dpi);
	return new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: 'rgba(0,0,0,0)' }).render().asPng();
}

/** Render at a fixed pixel width (review sheets). */
export function svgToPngWidth(svg: string, width: number, background = 'white'): Buffer {
	return new Resvg(svg, { fitTo: { mode: 'width', value: width }, background, font: { loadSystemFonts: true } }).render().asPng();
}
