import { createFileRoute } from "@tanstack/react-router";
import { type Column, createTableStore, Table } from "@/components/Table";

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
		},
		{
			header: "options",
			columns: [
				{
					header: "size",
					accessor: (row) => row.options.size,
					filter: "text",
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

	const table = createTableStore({
		data,
		columns,
	});

	return <Table useTableStore={table} />;
}
