import { createFileRoute } from "@tanstack/react-router";
import { type Column, createTableStore, Table } from "@/components/Table";
import type { UnpackArray } from "@/utils/types";

export type Pages = Page[];

export interface Page {
	id: number;
	title: string;
	active: boolean;
	updatedAt: Date;
	publishedAt: Date;
}

export const Route = createFileRoute("/pages")({
	loader: async () => {
		return (await fetch("/data/pages.json").then((res) => res.json())) as Pages;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();

	const columns: Column<UnpackArray<typeof data>>[] = [
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

	const table = createTableStore({
		data,
		columns,
	});

	return <Table useTableStore={table} />;
}
