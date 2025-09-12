import { createFileRoute } from "@tanstack/react-router";
import { Table } from "@/components/Table";

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
					header: "title",
					accessor: (row) => row.title,
					sort: true,
				},
				{
					header: "active",
					accessor: (row) => row.active,
					sort: true,
				},
				{
					header: "published",
					accessor: (row) => row.publishedAt,
					sort: true,
				},
				{
					header: "updatedAt",
					accessor: (row) => row.updatedAt,
					sort: true,
				},
			]}
		/>
	);
}
