import { Markdown } from "./components/markdown.ts";
import { Text } from "./components/text.ts";
import { Container, type Component } from "./tui.ts";

interface Snapshot {
 width: number;
 height: number;
 children?: Snapshot[];
 lines?: string[];
}
const snapshots = new WeakMap<Component, Snapshot>();
const roots = new WeakMap<Component, { snapshot: Snapshot; lines: string[] }>();
export const historyMouseLayouts = new WeakMap<Component, { width: number; children: Array<{ component: Component; height: number }> }>();

function snapshot(component: Component, width: number, containerRoot = false): Snapshot {
 const previous = snapshots.get(component);
 if (component instanceof Container && (containerRoot || Object.getPrototypeOf(component) === Container.prototype) && component.render === Container.prototype.render) {
  const children = component.children.map(child => snapshot(child, width));
  if (previous?.width === width && previous.children?.length === children.length && children.every((child, i) => child === previous.children![i])) return previous;
  const result = { width, height: children.reduce((sum, child) => sum + child.height, 0), children };
  snapshots.set(component, result);
  historyMouseLayouts.set(component, {width, children: component.children.map((child, i) => ({component: child, height: children[i]!.height}))});
  return result;
 }
 const trusted = (Object.getPrototypeOf(component) === Markdown.prototype && component.render === Markdown.prototype.render) || (Object.getPrototypeOf(component) === Text.prototype && component.render === Text.prototype.render);
 const rendered = component.render(width);
 if (trusted && previous?.width === width && previous.lines === rendered) return previous;
 // Custom renderers may mutate and return the same array on every call.
 const lines = trusted ? rendered : rendered.slice();
 const result = {width, height: lines.length, lines};
 if (trusted) snapshots.set(component, result);
 return result;
}

/** Internal document render: only roots retain flattened history. */
export function renderHistory(component: Component, width: number, containerRoot = false): string[] {
 if ((!containerRoot && Object.getPrototypeOf(component) !== Container.prototype) || component.render !== Container.prototype.render) return component.render(width);
 const current = snapshot(component, width, containerRoot);
 const previous = roots.get(component);
 if (previous?.snapshot === current) return previous.lines;
 const lines: string[] = [];
 function append(node: Snapshot): void {
  if (node.children) for (const child of node.children) append(child);
  else for (const line of node.lines ?? []) lines.push(line);
 }
 append(current);
 roots.set(component, {snapshot: current, lines});
 return lines;
}
