import { createFileRoute } from "@tanstack/react-router";
import { Table } from "@/components/Table";

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

	return (
		<Table
			data={data}
			columns={[
				{
					header: "ID",
					accessor: (row) => row.id,
					sort: true,
				},
				{
					header: "name",
					accessor: (row) => row.name,
					sort: true,
				},
				{
					header: "options",
					children: [
						{
							header: "size",
							accessor: (row) => row.options.size,
							sort: true,
						},
						{
							header: "amount",
							accessor: (row) => row.options.amount,
							sort: true,
						},
					],
				},
				{
					header: "active",
					accessor: (row) => row.active,
					sort: true,
				},
				{
					header: "createdAt",
					accessor: (row) => row.createdAt,
					sort: true,
				},
			]}
		/>
	);
}
