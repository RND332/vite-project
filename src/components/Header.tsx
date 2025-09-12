import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="p-2 flex gap-2 bg-white text-black justify-between">
			<nav className="flex flex-row">
				<div key="pages" className="px-2 font-bold">
					<Link to="/pages">Pages</Link>
				</div>
				<div key="price plans" className="px-2 font-bold">
					<Link to="/price_plans">Price Plans</Link>
				</div>
				<div key="products" className="px-2 font-bold">
					<Link to="/products">Products</Link>
				</div>
			</nav>
		</header>
	);
}
