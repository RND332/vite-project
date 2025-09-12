import { type JSX, useState } from "react";

//
// --- Types ---
//
type StringFilter = { type: "string"; minLength?: number; maxLength?: number };
type BooleanFilter = { type: "boolean"; value?: boolean };
type DateFilter = { type: "date"; before?: Date; after?: Date };
type NumberFilter = { type: "number"; min?: number; max?: number };

type FilterFor<T> = T extends string
	? StringFilter
	: T extends boolean
		? BooleanFilter
		: T extends Date
			? DateFilter
			: T extends number
				? NumberFilter
				: never;

export type LeafColumn<T> = {
	header: string;
	accessor: (row: T) => any;
	filter?: FilterFor<ReturnType<LeafColumn<T>["accessor"]>>;
	sort?: boolean;
};

export type GroupColumn<T> = {
	header: string;
	children: Column<T>[];
};

export type Column<T> = LeafColumn<T> | GroupColumn<T>;

const isLeaf = <T,>(c: Column<T>): c is LeafColumn<T> => "accessor" in c;

//
// --- Helpers ---
//
function countLeafs<T>(col: Column<T>): number {
	return isLeaf(col) ? 1 : col.children.reduce((n, c) => n + countLeafs(c), 0);
}

function getMaxDepth<T>(col: Column<T>): number {
	return isLeaf(col) ? 1 : 1 + Math.max(...col.children.map(getMaxDepth));
}

function getColumnsDepth<T>(columns: Column<T>[]): number {
	return Math.max(...columns.map(getMaxDepth));
}

//
// --- Filtering ---
//
function applyFilter<T>(rows: T[], column: LeafColumn<T>): T[] {
	if (!column.filter) return rows;

	return rows.filter((row) => {
		const value = column.accessor(row);
		if (!column.filter) return true;

		if (column.filter.type === "string" && typeof value === "string") {
			if (
				column.filter.minLength !== undefined &&
				value.length < column.filter.minLength
			)
				return false;
			if (
				column.filter.maxLength !== undefined &&
				value.length > column.filter.maxLength
			)
				return false;
		}

		if (column.filter.type === "boolean" && typeof value === "boolean") {
			if (column.filter.value !== undefined && value !== column.filter.value)
				return false;
		}

		if (column.filter.type === "date" && value instanceof Date) {
			if (column.filter.before && value > column.filter.before) return false;
			if (column.filter.after && value < column.filter.after) return false;
		}

		if (column.filter.type === "number" && typeof value === "number") {
			if (column.filter.min !== undefined && value < column.filter.min)
				return false;
			if (column.filter.max !== undefined && value > column.filter.max)
				return false;
		}

		return true;
	});
}

//
// --- Sorting ---
//
function applySort<T>(
	rows: T[],
	column: LeafColumn<T>,
	dir: "asc" | "desc",
): T[] {
	return [...rows].sort((a, b) => {
		const va = column.accessor(a);
		const vb = column.accessor(b);

		if (va === vb) return 0;
		if (va == null) return dir === "asc" ? -1 : 1;
		if (vb == null) return dir === "asc" ? 1 : -1;

		return dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
	});
}

//
// --- Header structure builder ---
//
interface HeaderCell<T> {
	key: string;
	col: Column<T>;
	depth: number;
	colSpan?: number;
	rowSpan?: number;
}

function buildHeaderStructure<T>(
	columns: Column<T>[],
	totalDepth: number,
): HeaderCell<T>[][] {
	const rows: HeaderCell<T>[][] = [];

	function walk(cols: Column<T>[], depth: number) {
		if (!rows[depth]) rows[depth] = [];

		for (const col of cols) {
			if (isLeaf(col)) {
				rows[depth].push({
					key: col.header + depth,
					col,
					depth,
					rowSpan: totalDepth - depth,
				});
			} else {
				rows[depth].push({
					key: col.header + depth,
					col,
					depth,
					colSpan: countLeafs(col),
				});
				walk(col.children, depth + 1);
			}
		}
	}

	walk(columns, 0);
	return rows;
}

//
// --- Table ---
//
export function Table<T>({
	data,
	columns,
}: {
	data: T[];
	columns: Column<T>[];
}) {
	const [filterState, setFilterState] = useState<{
		col: LeafColumn<T>;
		value: FilterFor<ReturnType<LeafColumn<T>["accessor"]>> | undefined;
	} | null>(null);
	const [sortState, setSortState] = useState<{
		col: LeafColumn<T>;
		dir: "asc" | "desc";
	} | null>(null);

	const processRows = (rows: T[]): T[] => {
		let r = rows;
		const collectFilters = (cols: Column<T>[]) => {
			for (const c of cols) {
				if (isLeaf(c)) r = applyFilter(r, c);
				else collectFilters(c.children);
			}
		};
		collectFilters(columns);

		if (sortState) r = applySort(r, sortState.col, sortState.dir);
		return r;
	};

	const rows = processRows(data);
	const totalDepth = getColumnsDepth(columns);
	const headerRows = buildHeaderStructure(columns, totalDepth);

	return (
		<table className="border-collapse border border-gray-500 w-full">
			<thead>
				{headerRows.map((cells, i) => (
					<tr key={i.toString()}>
						{cells.map((cell) => {
							const col = cell.col;
							if (isLeaf(col)) {
								return (
									<th
										key={cell.key}
										rowSpan={cell.rowSpan}
										className="border border-gray-500 px-2"
									>
										<div className="flex flex-col gap-2 items-center">
											<button
												type="button"
												className="cursor-pointer flex items-center bg-transparent border-none p-0 font-inherit"
												onClick={() => {
													if (!col.sort) return;
													setSortState((prev) =>
														prev && prev.col === col
															? {
																	col,
																	dir: prev.dir === "asc" ? "desc" : "asc",
																}
															: { col, dir: "asc" },
													);
												}}
											>
												{col.header}
												{sortState?.col === col
													? sortState.dir === "asc"
														? " ↑"
														: " ↓"
													: null}
											</button>
											{col.filter && (
												<button
													type="button"
													tabIndex={0}
													onClick={(e) => e.stopPropagation()}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.stopPropagation();
														}
													}}
												>
													{col.filter.type === "string" && (
														<div className="flex flex-row gap-1">
															<input
																type="text"
																placeholder="Min length"
																className="border px-1 text-xs"
																value={col.filter.minLength || ""}
																onChange={(e) => {
																	const value = e.target.value
																		? Number.parseInt(e.target.value)
																		: undefined;
																	col.filter = {
																		...col.filter,
																		minLength: value,
																	};
																	setFilterState({ col, value: col.filter });
																}}
															/>
															<input
																type="text"
																placeholder="Max length"
																className="border px-1 text-xs"
																value={col.filter.maxLength || ""}
																onChange={(e) => {
																	const value = e.target.value
																		? Number.parseInt(e.target.value)
																		: undefined;
																	col.filter = {
																		...col.filter,
																		maxLength: value,
																	};
																	setFilterState({ col, value: col.filter });
																}}
															/>
														</div>
													)}
													{col.filter.type === "boolean" && (
														<select
															className="border px-1 text-xs"
															value={
																col.filter.value === undefined
																	? ""
																	: col.filter.value.toString()
															}
															onChange={(e) => {
																const value =
																	e.target.value === ""
																		? undefined
																		: e.target.value === "true";
																col.filter = { ...col.filter, value };
																setFilterState({ col, value: col.filter });
															}}
														>
															<option value="">All</option>
															<option value="true">True</option>
															<option value="false">False</option>
														</select>
													)}
													{col.filter.type === "number" && (
														<div className="flex flex-col gap-1">
															<input
																type="number"
																placeholder="Min"
																className="border px-1 text-xs"
																value={col.filter.min || ""}
																onChange={(e) => {
																	const value = e.target.value
																		? Number.parseFloat(e.target.value)
																		: undefined;
																	col.filter = {
																		...col.filter,
																		min: value,
																	};
																	setFilterState({ col, value: col.filter });
																}}
															/>
															<input
																type="number"
																placeholder="Max"
																className="border px-1 text-xs"
																value={col.filter.max || ""}
																onChange={(e) => {
																	const value = e.target.value
																		? Number.parseFloat(e.target.value)
																		: undefined;
																	col.filter = {
																		...col.filter,
																		max: value,
																	};
																	setFilterState({ col, value: col.filter });
																}}
															/>
														</div>
													)}
													{col.filter.type === "date" && (
														<div className="flex flex-col gap-1">
															<input
																type="date"
																className="border px-1 text-xs"
																value={
																	col.filter.after
																		? col.filter.after
																				.toISOString()
																				.split("T")[0]
																		: ""
																}
																onChange={(e) => {
																	const value = e.target.value
																		? new Date(e.target.value)
																		: undefined;
																	col.filter = {
																		...col.filter,
																		after: value,
																	};
																	setFilterState({ col, value: col.filter });
																}}
															/>
															<input
																type="date"
																className="border px-1 text-xs"
																value={
																	col.filter.before
																		? col.filter.before
																				.toISOString()
																				.split("T")[0]
																		: ""
																}
																onChange={(e) => {
																	const value = e.target.value
																		? new Date(e.target.value)
																		: undefined;
																	col.filter = {
																		...col.filter,
																		before: value,
																	};
																	setFilterState({ col, value: col.filter });
																}}
															/>
														</div>
													)}
												</button>
											)}
										</div>
									</th>
								);
							}
							return (
								<th
									key={cell.key}
									colSpan={cell.colSpan}
									className="border border-gray-500 px-2"
								>
									{col.header}
								</th>
							);
						})}
					</tr>
				))}
			</thead>
			<tbody>
				{rows.map((row, r) => {
					const renderCells = (cols: Column<T>[]): JSX.Element[] =>
						cols.flatMap((col, i) =>
							isLeaf(col)
								? [
										<td
											key={col.header + i.toString()}
											className="border border-gray-500 px-2"
										>
											{String(col.accessor(row))}
										</td>,
									]
								: renderCells(col.children),
						);
					return <tr key={r.toString()}>{renderCells(columns)}</tr>;
				})}
			</tbody>
		</table>
	);
}
