import { createFileRoute } from "@tanstack/react-router";
import { type Column, Table, useTableData } from "@/components/Table";

export interface Page {
	id: number;
	title: string;
	active: boolean;
	updatedAt: Date;
	publishedAt: Date;
}

export const Route = createFileRoute("/pages")({
	loader: async () => {
		return (await fetch("/data/pages.json").then((res) =>
			res.json(),
		)) as Page[];
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();

	const columns: Column<Page>[] = [
		{
			header: "ID",
			accessor: (row) => row.id,
		},
		{
			header: "title",
			accessor: (row) => row.title,
		},
		{
			header: "active",
			accessor: (row) => row.active,
		},
		{
			header: "published",
			accessor: (row) => row.publishedAt,
		},
		{
			header: "updatedAt",
			accessor: (row) => row.updatedAt,
		},
	];

	const store = useTableData<Page>(data);

	return <Table dataStore={store} columns={columns} />;
}
