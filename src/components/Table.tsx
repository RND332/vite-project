import { type JSX, useMemo, useState } from "react";
import { create } from "zustand";

// ---------- Types ----------
type Accessor<T> = (row: T) => string | number | boolean | Date;

interface BaseColumn {
	header: string;
}

interface LeafColumn<T> extends BaseColumn {
	accessor: Accessor<T>;
	sort?: boolean;
	filter?: "text" | "number" | "date" | "boolean";
}

interface GroupColumn<T> extends BaseColumn {
	columns: Column<T>[];
}

export type Column<T> = LeafColumn<T> | GroupColumn<T>;
const isLeaf = <T,>(c: Column<T>): c is LeafColumn<T> => "accessor" in c;

// ---------- Store ----------
type SortState = { column: string; direction: "asc" | "desc" } | null;
type FilterFn<T> = (value: T) => boolean;

interface FilterState<T> {
	[header: string]: FilterFn<any> | undefined;
}

interface TableState<T extends { id: string | number }> {
	data: T[];
	columns: Column<T>[];
	sort: SortState;
	filters: FilterState<T>;
	setData: (data: T[]) => void;
	setColumns: (columns: Column<T>[]) => void;
	setSort: (sort: SortState) => void;
	setFilter: <V>(column: string, fn?: FilterFn<V>) => void;
}

export const createTableStore = <T extends { id: string | number }>(init: {
	data: T[];
	columns: Column<T>[];
}) =>
	create<TableState<T>>((set) => ({
		data: init.data,
		columns: init.columns,
		sort: null,
		filters: {},
		setData: (data) => set({ data }),
		setColumns: (columns) => set({ columns }),
		setSort: (sort) => set({ sort }),
		setFilter: (column, fn) =>
			set((s) => ({ filters: { ...s.filters, [column]: fn } })),
	}));

// ---------- Helpers ----------
const flattenColumns = <T,>(cols: Column<T>[]): LeafColumn<T>[] =>
	cols.flatMap((c) => (isLeaf(c) ? [c] : flattenColumns(c.columns)));

function getDepth<T>(col: Column<T>): number {
	return isLeaf(col) ? 1 : 1 + Math.max(...col.columns.map(getDepth));
}

function countLeaves<T>(col: Column<T>): number {
	return isLeaf(col) ? 1 : col.columns.reduce((s, c) => s + countLeaves(c), 0);
}

// ---------- Table Component ----------
export function Table<T extends { id: string | number }>({
	useTableStore,
}: {
	useTableStore: ReturnType<typeof createTableStore<T>>;
}) {
	const { data, columns, sort, setSort, filters, setFilter } = useTableStore();

	const flattenedColumns = flattenColumns(columns);

	// Apply filtering
	const filteredData = useMemo(() => {
		if (!Object.keys(filters).length) return data;
		return data.filter((row) =>
			flattenedColumns.every((col) => {
				const fn = filters[col.header];
				return fn ? fn(col.accessor(row)) : true;
			}),
		);
	}, [data, filters, flattenedColumns]);

	// Apply sorting
	const sortedData = useMemo(() => {
		if (!sort) return filteredData;
		const col = flattenedColumns.find((c) => c.header === sort.column);
		if (!col) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aVal = col.accessor(a);
			const bVal = col.accessor(b);

			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return sort.direction === "asc" ? -1 : 1;
			if (bVal == null) return sort.direction === "asc" ? 1 : -1;

			if (typeof aVal === "number" && typeof bVal === "number")
				return sort.direction === "asc" ? aVal - bVal : bVal - aVal;

			if (typeof aVal === "string" && typeof bVal === "string")
				return sort.direction === "asc"
					? aVal.localeCompare(bVal)
					: bVal.localeCompare(aVal);

			if (aVal instanceof Date && bVal instanceof Date)
				return sort.direction === "asc"
					? aVal.getTime() - bVal.getTime()
					: bVal.getTime() - aVal.getTime();

			if (typeof aVal === "boolean" && typeof bVal === "boolean")
				return sort.direction === "asc"
					? Number(aVal) - Number(bVal)
					: Number(bVal) - Number(aVal);

			return sort.direction === "asc"
				? String(aVal).localeCompare(String(bVal))
				: String(bVal).localeCompare(String(aVal));
		});
	}, [filteredData, sort, flattenedColumns]);

	const maxDepth = Math.max(...columns.map((c) => getDepth(c)));
	const headerRows = buildHeaderRows(
		columns,
		maxDepth,
		0,
		[],
		sort,
		setSort,
		setFilter,
	);

	return (
		<div className="overflow-x-auto shadow-lg rounded-lg">
			<table className="min-w-full bg-white border border-gray-200">
				<thead className="bg-gray-50">
					{headerRows.map((cells, i) => (
						<tr key={i.toString()}>{cells}</tr>
					))}
				</thead>
				<tbody className="divide-y divide-gray-200">
					{sortedData.map((row) => (
						<tr key={row.id} className="hover:bg-gray-50 transition-colors">
							{flattenedColumns.map((col) => (
								<td
									key={col.header}
									className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
								>
									{String(col.accessor(row))}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ---------- Header + Filters ----------
function buildHeaderRows<T>(
	cols: Column<T>[],
	maxDepth: number,
	depth = 0,
	rows: JSX.Element[][] = [],
	sort?: SortState,
	setSort?: (s: SortState | null) => void,
	setFilter?: (col: string, fn?: FilterFn<any>) => void,
): JSX.Element[][] {
	rows[depth] = rows[depth] || [];

	for (const col of cols) {
		if (isLeaf(col)) {
			const isSorted = sort?.column === col.header;
			const arrow = isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "⇅";

			rows[depth].push(
				<th
					key={`${depth}-${col.header}`}
					rowSpan={maxDepth - depth + 1} // +1 for filter row
					className="px-4 py-2 text-left"
				>
					<button
						type="button"
						className="flex items-center gap-1 cursor-pointer select-none w-full text-left"
						onClick={() => {
							if (!setSort) return;
							if (!isSorted) setSort({ column: col.header, direction: "asc" });
							else if (sort.direction === "asc")
								setSort({ column: col.header, direction: "desc" });
							else setSort(null);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								if (!setSort) return;
								if (!isSorted)
									setSort({ column: col.header, direction: "asc" });
								else if (sort.direction === "asc")
									setSort({ column: col.header, direction: "desc" });
								else setSort(null);
							}
						}}
					>
						<span>{col.header}</span>
						<span className="text-gray-400 text-xs">{arrow}</span>
					</button>
					{setFilter && col.filter && (
						<FilterInput
							type={col.filter}
							column={col.header}
							setFilter={setFilter}
						/>
					)}
				</th>,
			);
		} else {
			rows[depth].push(
				<th
					key={`${depth}-${col.header}`}
					colSpan={countLeaves(col)}
					className="px-4 py-2 text-left"
				>
					{col.header}
				</th>,
			);
			buildHeaderRows(
				col.columns,
				maxDepth,
				depth + 1,
				rows,
				sort,
				setSort,
				setFilter,
			);
		}
	}

	return rows;
}

// ---------- Filter Input Component with Range ----------
function FilterInput({
	type,
	column,
	setFilter,
}: {
	type: "text" | "number" | "date" | "boolean";
	column: string;
	setFilter: (col: string, fn?: FilterFn<any>) => void;
}) {
	const [min, setMin] = useState("");
	const [max, setMax] = useState("");

	switch (type) {
		case "text":
			return (
				<input
					type="text"
					className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
					onChange={(e) => {
						const val = e.target.value;
						if (!val) setFilter(column);
						else
							setFilter(column, (cell) =>
								String(cell).toLowerCase().includes(val.toLowerCase()),
							);
					}}
				/>
			);
		case "number":
			return (
				<div className="flex gap-1 mt-1">
					<input
						type="number"
						className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm"
						placeholder="Min"
						value={min}
						onChange={(e) => {
							setMin(e.target.value);
							const minVal = Number.parseFloat(e.target.value);
							const maxVal = Number.parseFloat(max);
							if (Number.isNaN(minVal) && Number.isNaN(maxVal))
								setFilter(column);
							else
								setFilter(column, (cell) => {
									const n = Number(cell);
									if (Number.isNaN(n)) return false;
									if (!Number.isNaN(minVal) && n < minVal) return false;
									if (!Number.isNaN(maxVal) && n > maxVal) return false;
									return true;
								});
						}}
					/>
					<input
						type="number"
						className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm"
						placeholder="Max"
						value={max}
						onChange={(e) => {
							setMax(e.target.value);
							const minVal = Number.parseFloat(min);
							const maxVal = Number.parseFloat(e.target.value);
							if (Number.isNaN(minVal) && Number.isNaN(maxVal))
								setFilter(column);
							else
								setFilter(column, (cell) => {
									const n = Number(cell);
									if (Number.isNaN(n)) return false;
									if (!Number.isNaN(minVal) && n < minVal) return false;
									if (!Number.isNaN(maxVal) && n > maxVal) return false;
									return true;
								});
						}}
					/>
				</div>
			);
		case "date":
			return (
				<div className="flex gap-1 mt-1">
					<input
						type="date"
						className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm"
						value={min}
						onChange={(e) => {
							setMin(e.target.value);
							const minDate = e.target.value
								? new Date(e.target.value).setHours(0, 0, 0, 0)
								: undefined;
							const maxDate = max
								? new Date(max).setHours(0, 0, 0, 0)
								: undefined;

							if (!minDate && !maxDate) setFilter(column);
							else
								setFilter(column, (cell) => {
									if (!(cell instanceof Date)) return false;
									const d = cell.setHours(0, 0, 0, 0);
									if (minDate && d < minDate) return false;
									if (maxDate && d > maxDate) return false;
									return true;
								});
						}}
					/>
					<input
						type="date"
						className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm"
						value={max}
						onChange={(e) => {
							setMax(e.target.value);
							const minDate = min
								? new Date(min).setHours(0, 0, 0, 0)
								: undefined;
							const maxDate = e.target.value
								? new Date(e.target.value).setHours(0, 0, 0, 0)
								: undefined;

							if (!minDate && !maxDate) setFilter(column);
							else
								setFilter(column, (cell) => {
									if (!(cell instanceof Date)) return false;
									const d = cell.setHours(0, 0, 0, 0);
									if (minDate && d < minDate) return false;
									if (maxDate && d > maxDate) return false;
									return true;
								});
						}}
					/>
				</div>
			);
		case "boolean":
			return (
				<select
					className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
					onChange={(e) => {
						const val = e.target.value;
						if (!val) setFilter(column);
						else
							setFilter(column, (cell) => Boolean(cell) === (val === "true"));
					}}
				>
					<option value="">All</option>
					<option value="true">True</option>
					<option value="false">False</option>
				</select>
			);
	}
}
