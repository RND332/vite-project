import { createFileRoute } from "@tanstack/react-router";
import { type Column, Table, useTableData } from "@/components/Table";
import type { UnpackArray } from "@/utils/types";

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
		)) as PricePlan[];
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();

	const columns: Column<PricePlan>[] = [
		{
			header: "ID",
			accessor: (row) => row.id,
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

	const store = useTableData<PricePlan>(data);

	return <Table dataStore={store} columns={columns} />;
}
