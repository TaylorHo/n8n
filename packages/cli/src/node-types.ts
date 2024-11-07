import type { NeededNodeType } from '@n8n/task-runner';
import type { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { loadClassInIsolation } from 'n8n-core';
import type {
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	LoadedClass,
} from 'n8n-workflow';
import { ApplicationError, NodeHelpers } from 'n8n-workflow';
import { join, dirname } from 'path';
import { Service } from 'typedi';

import { UnrecognizedNodeTypeError } from './errors/unrecognized-node-type.error';
import { LoadNodesAndCredentials } from './load-nodes-and-credentials';

@Service()
export class NodeTypes implements INodeTypes {
	constructor(private loadNodesAndCredentials: LoadNodesAndCredentials) {
		loadNodesAndCredentials.addPostProcessor(async () => this.applySpecialNodeParameters());
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.getNode(nodeTypeName);

		if (!nodeType) {
			throw new ApplicationError('Unknown node type', { tags: { nodeTypeName } });
		}

		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.getNode(nodeType).type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		const origType = nodeType;
		const toolRequested = nodeType.startsWith('n8n-nodes-base') && nodeType.endsWith('Tool');
		// Make sure the nodeType to actually get from disk is the un-wrapped type
		if (toolRequested) {
			nodeType = nodeType.replace(/Tool$/, '');
		}

		const node = this.getNode(nodeType);
		const versionedNodeType = NodeHelpers.getVersionedNodeType(node.type, version);
		if (!toolRequested) return versionedNodeType;

		if (!versionedNodeType.description.usableAsTool)
			throw new ApplicationError('Node cannot be used as a tool', { extra: { nodeType } });

		const { loadedNodes } = this.loadNodesAndCredentials;
		if (origType in loadedNodes) {
			return loadedNodes[origType].type as INodeType;
		}

		// Instead of modifying the existing type, we extend it into a new type object
		const clonedProperties = Object.create(
			versionedNodeType.description.properties,
		) as INodeTypeDescription['properties'];
		const clonedDescription = Object.create(versionedNodeType.description, {
			properties: { value: clonedProperties },
		}) as INodeTypeDescription;
		const clonedNode = Object.create(versionedNodeType, {
			description: { value: clonedDescription },
		}) as INodeType;
		const tool = NodeHelpers.convertNodeToAiTool(clonedNode);
		loadedNodes[nodeType + 'Tool'] = { sourcePath: '', type: tool };
		return tool;
	}

	/* Some nodeTypes need to get special parameters applied like the polling nodes the polling times */
	applySpecialNodeParameters() {
		for (const nodeTypeData of Object.values(this.loadNodesAndCredentials.loadedNodes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			NodeHelpers.applySpecialNodeParameters(nodeType);
		}
	}

	getKnownTypes() {
		return this.loadNodesAndCredentials.knownNodes;
	}

	private getNode(type: string): LoadedClass<INodeType | IVersionedNodeType> {
		const { loadedNodes, knownNodes } = this.loadNodesAndCredentials;
		if (type in loadedNodes) {
			return loadedNodes[type];
		}

		if (type in knownNodes) {
			const { className, sourcePath } = knownNodes[type];
			const loaded: INodeType = loadClassInIsolation(sourcePath, className);
			NodeHelpers.applySpecialNodeParameters(loaded);

			loadedNodes[type] = { sourcePath, type: loaded };
			return loadedNodes[type];
		}

		throw new UnrecognizedNodeTypeError(type);
	}

	async getNodeTranslationPath({
		nodeSourcePath,
		longNodeType,
		locale,
	}: {
		nodeSourcePath: string;
		longNodeType: string;
		locale: string;
	}) {
		const nodeDir = dirname(nodeSourcePath);
		const maxVersion = await this.getMaxVersion(nodeDir);
		const nodeType = longNodeType.replace('n8n-nodes-base.', '');

		return maxVersion
			? join(nodeDir, `v${maxVersion}`, 'translations', locale, `${nodeType}.json`)
			: join(nodeDir, 'translations', locale, `${nodeType}.json`);
	}

	private async getMaxVersion(dir: string) {
		const entries = await readdir(dir, { withFileTypes: true });

		const dirnames = entries.reduce<string[]>((acc, cur) => {
			if (this.isVersionedDirname(cur)) acc.push(cur.name);
			return acc;
		}, []);

		if (!dirnames.length) return null;

		return Math.max(...dirnames.map((d) => parseInt(d.charAt(1), 10)));
	}

	private isVersionedDirname(dirent: Dirent) {
		if (!dirent.isDirectory()) return false;

		const ALLOWED_VERSIONED_DIRNAME_LENGTH = [2, 3]; // e.g. v1, v10

		return (
			ALLOWED_VERSIONED_DIRNAME_LENGTH.includes(dirent.name.length) &&
			dirent.name.toLowerCase().startsWith('v')
		);
	}

	getNodeTypeDescriptions(nodeTypes: NeededNodeType[]): INodeTypeDescription[] {
		return nodeTypes.map(({ name: nodeTypeName, version: nodeTypeVersion }) => {
			const nodeType = this.getNode(nodeTypeName);

			if (!nodeType) throw new ApplicationError(`Unknown node type: ${nodeTypeName}`);

			const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, nodeTypeVersion);

			const descriptionCopy = { ...description };

			descriptionCopy.name = descriptionCopy.name.startsWith('n8n-nodes')
				? descriptionCopy.name
				: `n8n-nodes-base.${descriptionCopy.name}`; // nodes-base nodes are unprefixed

			return descriptionCopy;
		});
	}
}