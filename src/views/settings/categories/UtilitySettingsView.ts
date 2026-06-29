import { ButtonComponent, Modal, Setting, TFile } from "obsidian";
import { getMySwitcher } from "@/views/settings/categories/getMySwitcher";
import type { BaseGraph3dView } from "@/views/graph/3dView/Graph3dView";
import { createNotice } from "@/util/createNotice";
import * as THREE from "three";

class CreateRingModal extends Modal {
  private view: BaseGraph3dView;

  constructor(view: BaseGraph3dView) {
    super(view.plugin.app);
    this.view = view;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Create ring node" });

    let noteName = "";
    let filterTag = "";

    new Setting(contentEl).setName("Note name").addText((text) => {
      text.setPlaceholder("e.g. logs_ring1").onChange((v) => (noteName = v.trim()));
    });

    new Setting(contentEl)
      .setName("Filter tag")
      .setDesc("Nodes tagged with this will orbit the ring.")
      .addText((text) => {
        text.setPlaceholder("e.g. ring1").onChange((v) => (filterTag = v.trim()));
      });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Create")
        .setCta()
        .onClick(async () => {
          if (!noteName || !filterTag) {
            createNotice("Enter both a note name and a filter tag.");
            return;
          }
          const path = `${noteName}.md`;
          const content = `---\ntags:\n  - ring\nring-filter: ${filterTag}\nradius: 80\nring-normal:\n  - 0\n  - 1\n  - 0\n---\n`;
          const existing = this.app.vault.getAbstractFileByPath(path) as TFile | null;
          if (existing instanceof TFile) {
            await this.app.fileManager.processFrontMatter(existing, (fm) => {
              if (!fm.tags) fm.tags = [];
              if (!fm.tags.includes("ring")) fm.tags.push("ring");
              fm["ring-filter"] = filterTag;
              if (!fm.radius) fm.radius = 80;
              if (!fm["ring-normal"]) fm["ring-normal"] = [0, 1, 0];
            });
            createNotice(
              `${noteName} already existed — ring fields added. Reload rings to activate.`
            );
          } else {
            await this.app.vault.create(path, content);
            createNotice(`Created ${path} — reload rings to activate.`);
          }
          this.close();
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class EditRingModal extends Modal {
  private view: BaseGraph3dView;

  constructor(view: BaseGraph3dView) {
    super(view.plugin.app);
    this.view = view;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Edit ring normal" });

    const rings = this.view.plugin.ringManager.getRings();
    if (rings.length === 0) {
      contentEl.createEl("p", { text: "No rings loaded. Reload rings first." });
      return;
    }

    const firstRing = rings[0]!;
    let selectedPath = firstRing.path;
    let nx = firstRing.normal.x;
    let ny = firstRing.normal.y;
    let nz = firstRing.normal.z;

    const updateInputs = (path: string) => {
      const ring = this.view.plugin.ringManager.getRing(path);
      if (!ring) return;
      nx = parseFloat(ring.normal.x.toFixed(4));
      ny = parseFloat(ring.normal.y.toFixed(4));
      nz = parseFloat(ring.normal.z.toFixed(4));
      xInput.setValue(String(nx));
      yInput.setValue(String(ny));
      zInput.setValue(String(nz));
    };

    new Setting(contentEl).setName("Ring").addDropdown((dd) => {
      rings.forEach((r) => dd.addOption(r.path, r.path.replace(/\.md$/, "")));
      dd.setValue(selectedPath);
      dd.onChange((v) => {
        selectedPath = v;
        updateInputs(v);
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let xInput: any, yInput: any, zInput: any;

    new Setting(contentEl).setName("Normal X").addText((t) => {
      xInput = t;
      t.setValue(String(parseFloat(nx.toFixed(4)))).onChange((v) => (nx = parseFloat(v) || 0));
    });
    new Setting(contentEl).setName("Normal Y").addText((t) => {
      yInput = t;
      t.setValue(String(parseFloat(ny.toFixed(4)))).onChange((v) => (ny = parseFloat(v) || 0));
    });
    new Setting(contentEl).setName("Normal Z").addText((t) => {
      zInput = t;
      t.setValue(String(parseFloat(nz.toFixed(4)))).onChange((v) => (nz = parseFloat(v) || 0));
    });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Apply")
        .setCta()
        .onClick(async () => {
          const normal = new THREE.Vector3(nx, ny, nz);
          if (normal.lengthSq() < 0.0001) {
            createNotice("Normal vector can't be zero.");
            return;
          }
          this.view.plugin.ringManager.setNormal(selectedPath, normal);
          await this.view.plugin.ringManager.persistNormal(selectedPath, normal);
          this.view.getForceGraph()?.reloadRingMeshes();
          createNotice("Ring normal updated.");
          this.close();
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

export const UtilitySettingsView = async (containerEl: HTMLElement, view: BaseGraph3dView) => {
  const plugin = view.plugin;

  const div = containerEl.createDiv();

  // set the containerEl to have flex col space 4px between items
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.gap = "4px";

  new ButtonComponent(div).setButtonText("Search").onClick(() => {
    const MySwitcher = getMySwitcher(view);

    if (MySwitcher === undefined) return;
    const modal = new MySwitcher(plugin.app, plugin);
    modal.open();
  });

  new ButtonComponent(div).setButtonText("Look at center").onClick(() => {
    // TODO: change all event to enum
    view.getForceGraph()?.interactionManager.cameraLookAtCenter();
  });

  new ButtonComponent(div).setButtonText("Remove selection").onClick(() => {
    view.getForceGraph()?.interactionManager.removeSelection();
  });

  new ButtonComponent(div).setButtonText("Clear saved layout").onClick(async () => {
    await plugin.nodePositionManager.clear();
    const forceGraph = view.getForceGraph();
    if (forceGraph) {
      // unpin all nodes so physics takes over again
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      forceGraph.instance.graphData().nodes.forEach((node: any) => {
        node.fx = undefined;
        node.fy = undefined;
        node.fz = undefined;
      });
      forceGraph.instance.numDimensions(3); // reheat simulation
    }
  });

  new ButtonComponent(div).setButtonText("Create ring").onClick(() => {
    new CreateRingModal(view).open();
  });

  new ButtonComponent(div).setButtonText("Edit ring normal").onClick(() => {
    new EditRingModal(view).open();
  });
};
