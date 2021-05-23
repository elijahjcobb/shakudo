/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

/**
 * This class handles parsing the source to determine which sections of code are non-editable as they are blocks.
 */
export class BlockloyParser {

	/**
	 * Set to private so that a new instance cannot be made. Parse is static.
	 * @private
	 */
	private constructor() {}

	/**
	 * Parse the source and return an array of start and end objects determining where blocks should be.
	 * @param value The source code.
	 */
	public static parse(value: string): {s: number, e: number}[] {

		const lines: string[] = value.split("\n");
		const sections: {s: number, e: number}[] = [];
		let lastStart: number = -1;

		let l: number = 0;
		let w: number = 0;
		for (const line of lines) {
			const words: string[] = line.split(" ");
			for (const word of words) {
				w = 0;
				if (word === "@blockloy-start") {
					lastStart = l;
				} else if (word === "@blockloy-end") {
					sections.push({s: lastStart, e: l});
					lastStart = -1;
				}
				w++;
			}
			l++;
		}

		return sections;

	}

}
