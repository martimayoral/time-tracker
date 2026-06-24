import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <>
      <div>Hi</div>
      <div className="text-red-600">This is starting point</div>
    </>
  )
}
