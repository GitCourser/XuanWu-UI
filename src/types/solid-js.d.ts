import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface HTMLAttributes<T> {
      "prop:key"?: string | number;
    }
  }
}