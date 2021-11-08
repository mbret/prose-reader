export const useHasTouch = () => {
    return (
      'ontouchstart' in window ||
      !!navigator.maxTouchPoints ||
      (`msMaxTouchPoints` in navigator)
    )
}