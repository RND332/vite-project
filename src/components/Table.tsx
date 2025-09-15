import { type JSX, useMemo, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { Modal } from "./Modal";

// ---------- Types ----------
type Accessor<T, V> = (row: T) => V;

interface BaseColumn {
	header: string;
}

interface LeafColumn<T, V> extends BaseColumn {
	accessor: Accessor<T, V>;
	sort?: boolean;
	filter?: string;
	filterProps?: unknown;
	edit?: boolean;
}

interface GroupColumn<T> extends BaseColumn {
	columns: Column<T>[];
}

export type Column<T> = LeafColumn<T, unknown> | GroupColumn<T>;
const isLeaf = <T,>(c: Column<T>): c is LeafColumn<T, unknown> =>
	"accessor" in c;

type SortState = { column: string; direction: "asc" | "desc" } | null;
export type FilterFn<V> = (value: V) => boolean;

interface FilterState {
	[header: string]: FilterFn<unknown> | undefined;
}

interface TableState {
	sort: SortState;
	filters: FilterState;
	filterRegistry: Map<string, FilterRenderer<unknown, unknown>>;
	setSort: (sort: SortState) => void;
	setFilter: <V>(column: string, fn?: FilterFn<V>) => void;
	registerFilter: <V, P = void>(
		key: string,
		renderer: FilterRenderer<V, P>,
	) => void;
}

export const useTableStore = create<TableState>((set) => ({
	sort: null,
	filters: {},
	filterRegistry: new Map<string, FilterRenderer<unknown, unknown>>([
		[
			"text",
			({ column, setFilter }) => (
				<input
					type="text"
					className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
					onChange={(e) => {
						const val = e.target.value;
						if (!val) setFilter(column);
						else
							setFilter(
								column,
								(cell) =>
									typeof cell === "string" &&
									cell.toLowerCase().includes(val.toLowerCase()),
							);
					}}
				/>
			),
		],
		[
			"boolean",
			({ column, setFilter }) => (
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
			),
		],
		[
			"number",
			({ column, setFilter }) => {
				const [min, setMin] = useState("");
				const [max, setMax] = useState("");
				return (
					<div className="flex gap-1 mt-1">
						<input
							type="number"
							className="w-[150px] border border-gray-300 rounded px-2 py-1 text-sm"
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
										if (!cell && cell !== 0) return false;
										const cellNum = Number.parseFloat(String(cell));
										if (!Number.isNaN(minVal) && cellNum < minVal) return false;
										if (!Number.isNaN(maxVal) && cellNum > maxVal) return false;
										return true;
									});
							}}
						/>
						<input
							type="number"
							className="w-[150px] border border-gray-300 rounded px-2 py-1 text-sm"
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
										if (!cell && cell !== 0) return false;
										const cellNum = Number.parseFloat(String(cell));
										if (!Number.isNaN(minVal) && cellNum < minVal) return false;
										if (!Number.isNaN(maxVal) && cellNum > maxVal) return false;
										return true;
									});
							}}
						/>
					</div>
				);
			},
		],
		[
			"date",
			({ column, setFilter }) => {
				const [min, setMin] = useState("");
				const [max, setMax] = useState("");
				return (
					<div className="flex gap-1 mt-1">
						<input
							type="date"
							className="w-[50px] border border-gray-300 rounded px-2 py-1 text-sm"
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
							className="w-[50px] border border-gray-300 rounded px-2 py-1 text-sm"
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
			},
		],
	]),
	setSort: (sort) => set({ sort }),
	setFilter: (column, fn) =>
		set((s) => ({
			filters: {
				...s.filters,
				[column]: fn as FilterFn<unknown> | undefined,
			},
		})),
	registerFilter: (key, renderer) => {
		set((s) => {
			const newRegistry = new Map(s.filterRegistry);
			newRegistry.set(key, renderer as FilterRenderer<unknown, unknown>);
			return { filterRegistry: newRegistry };
		});
	},
}));

export const useTableData = <T,>(data: T[]) =>
	create<{
		data: T[];
		setData: (data: T[]) => void;
	}>()((set) => ({
		data: data,
		setData: (data: T[]) => set({ data }),
	}));

// ---------- Filter Registry ----------
export type FilterRenderer<V, P = void> = (args: {
	column: string;
	setFilter: (col: string, fn?: FilterFn<V>) => void;
	columnProps?: P;
}) => JSX.Element;

export function Table<T extends { id: string | number }>({
	dataStore,
	columns,
	customFilters,
}: {
	dataStore: ReturnType<typeof useTableData<T>>;
	columns: Column<T>[];
	customFilters?: Record<string, FilterRenderer<unknown, unknown>>;
}) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [targetCell, setTargetCell] = useState<{
		rowId: string | number;
		column: LeafColumn<T, unknown>;
	} | null>(null);
	const [newValue, setNewValue] = useState<string>("");

	const sort = useTableStore((state) => state.sort);
	const setSort = useTableStore((state) => state.setSort);
	const setFilter = useTableStore((state) => state.setFilter);
	const registerFilter = useTableStore((state) => state.registerFilter);
	const activeFilters = useTableStore(useShallow((state) => state.filters));

	const tableData = dataStore(useShallow((state) => state.data));
	const setData = dataStore((state) => state.setData);

	for (const [key, renderer] of Object.entries(customFilters ?? {})) {
		registerFilter(key, renderer);
	}

	const flattenedColumns = flattenColumns(columns);

	// Filtering
	const filteredData = useMemo(() => {
		if (!Object.keys(activeFilters).length) return tableData;
		return tableData.filter((row) =>
			flattenedColumns.every((col) => {
				const fn = activeFilters[col.header];
				return fn ? fn(col.accessor(row)) : true;
			}),
		);
	}, [tableData, activeFilters, flattenedColumns]);

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

	const maxDepth = Math.max(...columns.map(getDepth));
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
									className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 "
								>
									<div className="flex flex-row justify-between items-center">
										{String(col.accessor(row))}
										{col.edit && (
											<div className="w-12 text-center cursor-pointer rounded-lg whitespace-nowrap text-sm border-2 text-gray-900">
												<button
													type="button"
													onMouseEnter={() => {
														setTargetCell({ rowId: row.id, column: col });
													}}
													onClick={() => {
														setIsModalOpen(true);
													}}
													className="cursor-pointer"
												>
													Edit
												</button>
											</div>
										)}
									</div>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			<Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="p-4">
					<h2 className="text-lg font-semibold mb-4">Edit Cell</h2>
					{targetCell && tableData.find((d) => d.id === targetCell.rowId) && (
						<>
							<div>
								<p>
									Editing cell at row {targetCell.rowId}, column{" "}
									{targetCell.column.header}
								</p>
							</div>
							<input
								type="text"
								className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm"
								defaultValue={String(
									targetCell.column.accessor(
										tableData.find((d) => d.id === targetCell.rowId)!,
									),
								)}
								onChange={(e) => setNewValue(e.target.value)}
							/>
							<div className="mt-4 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => {
										const newData = tableData.map((item: T) =>
											item.id === targetCell.rowId
												? { ...item, [targetCell.column.header]: newValue }
												: item,
										);
										setData(newData);
										setIsModalOpen(false);
									}}
									className="cursor-pointer"
								>
									Save
								</button>
							</div>
						</>
					)}
				</div>
			</Modal>
		</div>
	);
}

// ---------- Helpers ----------
const flattenColumns = <T,>(cols: Column<T>[]): LeafColumn<T, unknown>[] =>
	cols.flatMap((c) => (isLeaf(c) ? [c] : flattenColumns(c.columns)));

function getDepth<T>(col: Column<T>): number {
	return isLeaf(col) ? 1 : 1 + Math.max(...col.columns.map(getDepth));
}

function countLeaves<T>(col: Column<T>): number {
	return isLeaf(col) ? 1 : col.columns.reduce((s, c) => s + countLeaves(c), 0);
}

function buildHeaderRows<T>(
	cols: Column<T>[],
	maxDepth: number,
	depth = 0,
	rows: JSX.Element[][] = [],
	sort?: SortState,
	setSort?: (s: SortState | null) => void,
	setFilter?: (col: string, fn?: FilterFn<unknown>) => void,
): JSX.Element[][] {
	rows[depth] = rows[depth] || [];
	for (const col of cols) {
		if (isLeaf(col)) {
			const isSorted = sort?.column === col.header;
			const arrow = isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "⇅";

			rows[depth].push(
				<th
					key={`${depth}-${col.header}`}
					rowSpan={maxDepth - depth + 1}
					className="cursor-pointer select-none px-4 py-2 text-left"
				>
					<button
						type="button"
						className="flex items-center gap-1 w-full text-left"
						onClick={() => {
							if (!setSort) return;
							if (!isSorted) setSort({ column: col.header, direction: "asc" });
							else if (sort.direction === "asc")
								setSort({ column: col.header, direction: "desc" });
							else setSort(null);
						}}
					>
						<span>{col.header}</span>
						<span className="text-gray-400 text-xs">{arrow}</span>
					</button>
					{setFilter && col.filter && (
						<FilterInput
							type={col.filter}
							column={col.header}
							setFilter={
								setFilter as <V>(col: string, fn?: FilterFn<V>) => void
							}
							columnProps={col.filterProps}
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

function FilterInput<T>({
	type,
	column,
	setFilter,
	columnProps,
}: {
	type: string;
	column: string;
	setFilter: <V>(col: string, fn?: FilterFn<V>) => void;
	columnProps?: T;
}) {
	const filterRegistry = useTableStore((state) => state.filterRegistry);

	const Renderer = filterRegistry.get(type) as
		| FilterRenderer<unknown, T>
		| undefined;
	if (!Renderer) return null;
	return (
		<Renderer column={column} setFilter={setFilter} columnProps={columnProps} />
	);
}
