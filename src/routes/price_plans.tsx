import { createFileRoute } from "@tanstack/react-router";
import { Table } from "@/components/Table";

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
					header: "description",
					accessor: (row) => row.description,
					sort: true,
					filter: { type: "string", minLength: 3, maxLength: 100 },
				},
				{
					header: "createdAt",
					accessor: (row) => row.createdAt,
					sort: true,
					filter: (row) => ({
						type: "date",
						before: new Date(row.createdAt.toString()),
						after: new Date(row.createdAt.toString()),
					}),
				},
				{
					header: "removedAt",
					accessor: (row) => row.removedAt,
					sort: true,
					filter: { type: "date", before: new Date(), after: new Date() },
				},
			]}
		/>
	);
}
