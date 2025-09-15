/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import { type ReactNode, useState } from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
	if (!open) return null;

	return (
		<div
			className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
		>
			<div
				className="bg-white rounded-lg p-4 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	);
}
