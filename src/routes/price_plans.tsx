import { createFileRoute } from "@tanstack/react-router";
import { type Column, createTableStore, Table } from "@/components/Table";
import type { UnpackArray } from "@/utils/types";

export type PricePlans = PricePlan[];

export interface PricePlan {
	id: number;
	description: string;
	active: boolean;
	createdAt: Date;
	removedAt: Date;
}

export const Route = createFileRoute("/price_plans")({
	loader: async () => {
		return (await fetch("/data/price_plans.json").then((res) =>
			res.json(),
		)) as PricePlans;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();

	const lowestDate = data.reduce(
		(min, p) => (p.createdAt < min ? p.createdAt : min),
		data[0]?.createdAt ?? new Date(),
	);
	const highestDate = data.reduce(
		(max, p) => (p.createdAt > max ? p.createdAt : max),
		data[0]?.createdAt ?? new Date(),
	);

	const columns: Column<UnpackArray<typeof data>>[] = [
		{
			header: "ID",
			accessor: (row) => row.id,
			filter: (value) => {
				return Number(value) > 2;
			},
		},
		{
			header: "description",
			accessor: (row) => row.description,
		},
		{
			header: "createdAt",
			accessor: (row) => row.createdAt,
		},
		{
			header: "removedAt",
			accessor: (row) => row.removedAt,
		},
	];

	const table = createTableStore({
		data,
		columns,
	});

	return <Table useTableStore={table} />;
}
