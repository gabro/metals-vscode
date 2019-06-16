import { LanguageClient, Disposable } from "vscode-languageclient";
import {
  TreeDataProvider,
  TreeItem,
  Event,
  EventEmitter,
  TreeItemCollapsibleState,
  window,
  OutputChannel,
  Uri
} from "vscode";
import {
  TreeViewNode,
  MetalsTreeViewChildren,
  MetalsTreeViewDidChange
} from "./protocol";

export function startTreeView(
  client: LanguageClient,
  out: OutputChannel
): Disposable[] {
  let views: Map<string, MetalsTreeView> = new Map();
  client.onNotification(MetalsTreeViewDidChange.type, params => {
    let treeView = views.get(params.viewId);
    if (!treeView) return;
    treeView.items.set(params.nodeUri, params);
    treeView.didChange.fire(params.nodeUri);
  });
  let viewIds: string[] = ["commands"];
  return viewIds.map(viewId => {
    let provider = new MetalsTreeView(client, out, viewId);
    views.set(viewId, provider);
    return window.createTreeView(viewId, {
      treeDataProvider: provider
    });
  });
}

class MetalsTreeView implements TreeDataProvider<string> {
  didChange = new EventEmitter<string>();
  onDidChangeTreeData?: Event<string> = this.didChange.event;
  items: Map<string, TreeViewNode> = new Map();
  constructor(
    readonly client: LanguageClient,
    readonly out: OutputChannel,
    readonly viewId: string
  ) {}
  getTreeItem(uri: string): TreeItem {
    this.out.appendLine("getTreeItem() " + JSON.stringify(uri));
    const item = this.items.get(uri);
    if (!item) return {};
    return {
      label: item.label,
      id: item.nodeUri,
      resourceUri: Uri.parse(item.nodeUri),
      collapsibleState: item.isCollapsible
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    };
  }
  getChildren(uri?: string): Thenable<string[]> {
    this.out.appendLine("getChildren() " + JSON.stringify(uri));
    return this.client
      .sendRequest(MetalsTreeViewChildren.type, {
        uri: uri
      })
      .then(result => {
        for (const item in this.items) {
          this.items.delete(item);
        }
        result.nodes.forEach(n => {
          this.items.set(n.nodeUri, n);
        });
        return result.nodes.map(n => n.nodeUri);
      });
  }
}
