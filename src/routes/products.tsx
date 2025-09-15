import { createFileRoute } from "@tanstack/react-router";
import { use } from "react";
import {
	type Column,
	type FilterFn,
	type FilterRenderer,
	Table,
	useTableData,
} from "@/components/Table";

export type Products = Product[];

export interface Product {
	id: number;
	name: string;
	options: Options;
	active: boolean;
	createdAt: Date;
}

export interface Options {
	size: string;
	amount: number;
}

export const Route = createFileRoute("/products")({
	loader: async () => {
		return (await fetch("/data/products.json").then((res) =>
			res.json(),
		)) as Products;
	},
	component: RouteComponent,
});

const filters: Record<string, FilterRenderer<unknown, unknown>> = {
	size: ({
		column,
		setFilter,
	}: {
		column: string;
		setFilter: (col: string, fn?: FilterFn<unknown>) => void;
	}) => {
		const options = ["S", "M", "L", "XL", "XXL"];

		return (
			<select
				defaultValue=""
				className="border rounded px-2 py-1 text-sm"
				onChange={(e) => {
					const val = e.target.value;
					if (!val) {
						setFilter(column, undefined); // reset filter
					} else {
						setFilter(column, (cell) => cell === val);
					}
				}}
			>
				<option value="">All</option>
				{options.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		);
	},
};

function RouteComponent() {
	const data = Route.useLoaderData();

	const columns: Column<Product>[] = [
		{
			header: "ID",
			accessor: (row) => row.id,
		},
		{
			header: "name",
			accessor: (row) => row.name,
			filter: "text",
			edit: true,
		},
		{
			header: "options",
			columns: [
				{
					header: "size",
					accessor: (row) => row.options.size,
					filter: "size",
					filterProps: { placeholder: "Filter by size" },
				},
				{
					header: "amount",
					accessor: (row) => row.options.amount,
					filter: "number",
				},
			],
		},
		{
			header: "active",
			accessor: (row) => row.active,
			filter: "boolean",
		},
		{
			header: "createdAt",
			accessor: (row) => row.createdAt,
			filter: "date",
		},
	];

	const store = useTableData<Product>(data);

	return <Table dataStore={store} columns={columns} customFilters={filters} />;
}
