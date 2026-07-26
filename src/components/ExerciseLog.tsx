import { formatBlock } from "../lib/format";
import SessionForm from "./SessionForm";

export type SessionView = {
	id: string;
	date: string;
	unit: "lb" | "kg";
	bodyweight?: number;
	notes?: string;
	lifts: {
		name: string;
		notes?: string;
		blocks: {
			sets: number;
			reps?: number;
			repsTo?: number;
			weight?: number;
			durationSec?: number;
			distanceM?: number;
		}[];
	}[];
};

type Props = {
	sessions: SessionView[];
	error?: string;
	formError?: string;
};

export default function ExerciseLog({ sessions, error, formError }: Props) {
	return (
		<div className="px-5 pt-4 pb-8 max-w-3xl space-y-8">
			<div>
				<h1 className="text-xl mb-1">Exercise Log</h1>
				<p className="text-sm text-gray-100/70">Sessions from D1</p>
			</div>

			<section className="rounded-sm bg-gray-800 p-4">
				<h2 className="text-base font-medium mb-3">New session</h2>
				{formError ? (
					<p className="mb-3 text-sm text-yellow-400">{formError}</p>
				) : null}
				<SessionForm />
			</section>

			<section>
				<h2 className="text-base font-medium mb-3">History</h2>
				{error ? (
					<p className="text-sm text-yellow-400">{error}</p>
				) : sessions.length === 0 ? (
					<p className="text-sm text-gray-100/70">No sessions yet.</p>
				) : (
					<ul className="space-y-3">
						{sessions.map((session) => (
							<li
								key={session.id}
								className="rounded-sm bg-gray-700 p-3"
							>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<span className="font-medium">{session.date}</span>
									<span className="text-sm text-gray-100/70">
										{session.bodyweight != null
											? `${session.bodyweight} ${session.unit} BW`
											: session.unit}
									</span>
								</div>
								<ul className="mt-2 space-y-1.5">
									{session.lifts.map((lift, i) => (
										<li key={`${session.id}-${i}`} className="text-sm">
											<span className="font-medium">{lift.name}</span>
											<span className="text-gray-100/80">
												{" — "}
												{lift.blocks
													.map((b) => formatBlock(b, session.unit))
													.join(" · ")}
											</span>
											{lift.notes ? (
												<span className="block text-gray-100/60">
													{lift.notes}
												</span>
											) : null}
										</li>
									))}
								</ul>
								{session.notes ? (
									<p className="mt-2 text-sm text-gray-100/70">
										{session.notes}
									</p>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
