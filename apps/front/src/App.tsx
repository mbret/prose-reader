import { lazy, memo, type ReactNode, Suspense } from "react"
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useMatch,
} from "react-router"
import { LazyRouteBoundary } from "./components/LazyRouteBoundary"
import { RouteLoading } from "./components/RouteLoading"
import { Provider } from "./components/ui/provider"
import { DEMO_BASE_PATH } from "./constants"
import { LandingScreen } from "./landing/LandingScreen"

/**
 * The demo pulls the whole reading engine (and its pdf/zip dependencies) with
 * it. Keep it out of the landing page bundle.
 */
const DemoRoutes = lazy(() => import("./demo/DemoRoutes"))

/**
 * The landing page is only designed for a light color scheme, the demo follows
 * the user preference. Which subtree is which is a question the route table
 * below already answers, so it is asked with the router's own matcher rather
 * than by comparing the pathname a second time - react-router matches a path
 * case insensitively, and a hand rolled comparison would not.
 */
const ColorScheme = ({ children }: { children: ReactNode }) => {
  const isDemo = useMatch(`${DEMO_BASE_PATH}/*`) !== null

  return (
    <Provider forcedTheme={isDemo ? undefined : "light"}>{children}</Provider>
  )
}

export const App = memo(() => {
  return (
    <Router>
      <ColorScheme>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route
            path={`${DEMO_BASE_PATH}/*`}
            element={
              <LazyRouteBoundary>
                <Suspense fallback={<RouteLoading />}>
                  <DemoRoutes />
                </Suspense>
              </LazyRouteBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ColorScheme>
    </Router>
  )
})
