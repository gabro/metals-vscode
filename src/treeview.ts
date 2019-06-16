import { LanguageClient, Disposable } from "vscode-languageclient";
import {
  TreeDataProvider,
  TreeItem,
  Event,
  EventEmitter,
  TreeItemCollapsibleState,
  window,
  OutputChannel,
  Uri,
  Command
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
  let viewIds: string[] = ["commands", "build"];
  const providers = viewIds.map(viewId => {
    let provider = new MetalsTreeView(client, out, viewId, views);
    views.set(viewId, provider);
    return window.createTreeView(viewId, {
      treeDataProvider: provider
    });
  });
  client.onNotification(MetalsTreeViewDidChange.type, params => {
    params.nodes.forEach(node => {
      let treeView = views.get(node.viewId);
      if (!treeView) {
        const bar = views.get("commands");
        return;
      } else {
      }
      if (node.nodeUri) {
        treeView.items.set(node.nodeUri, node);
      }
      if (node.nodeUri) {
        treeView.didChange.fire(node.nodeUri);
      } else {
        treeView.didChange.fire(undefined);
      }
    });
  });
  return providers;
}

class MetalsTreeView implements TreeDataProvider<string> {
  didChange = new EventEmitter<string>();
  onDidChangeTreeData?: Event<string> = this.didChange.event;
  items: Map<string, TreeViewNode> = new Map();
  constructor(
    readonly client: LanguageClient,
    readonly out: OutputChannel,
    readonly viewId: string,
    readonly views: Map<string, MetalsTreeView>
  ) {}
  getTreeItem(uri: string): TreeItem {
    this.out.appendLine("getTreeItem() " + JSON.stringify(uri));
    const item = this.items.get(uri);
    if (!item) return {};
    var command: Command | undefined = undefined;
    if (item.command) {
      command = {
        title: "Metals!!",
        command: "metals." + item.command
      };
    }
    return {
      label: item.label,
      id: item.nodeUri,
      resourceUri: item.nodeUri ? Uri.parse(item.nodeUri) : undefined,
      collapsibleState: item.isCollapsible
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None,
      command: command,
      tooltip: item.tooltip
    };
  }
  getChildren(uri?: string): Thenable<string[]> {
    this.out.appendLine("getChildren() " + JSON.stringify(uri));
    return this.client
      .sendRequest(MetalsTreeViewChildren.type, {
        viewId: this.viewId,
        nodeUri: uri
      })
      .then(result => {
        result.nodes.forEach(n => {
          if (n.nodeUri) {
            this.items.set(n.nodeUri, n);
          }
        });
        return result.nodes.map(n => n.nodeUri).filter(notEmpty);
      });
  }
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
