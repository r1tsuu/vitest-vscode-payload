import fs from 'node:fs'
import path from 'node:path'
import { createSourceFile, isIdentifier, isObjectLiteralExpression, isPropertyAssignment, isStringLiteral, isVariableStatement, NodeFlags, ScriptTarget } from 'typescript'

import * as vscode from 'vscode'

function collectDatabaseAdapterNames(generateDatabaseAdapterSource: string): string[] {
  const result: string[] = []

  const sourceFile = createSourceFile('generateDatabaseAdapter.ts', generateDatabaseAdapterSource, ScriptTarget.ESNext)

  for (const statement of sourceFile.statements) {
    if (!isVariableStatement(statement))
      continue

    if (!(statement.declarationList.flags & NodeFlags.Const))
      continue

    for (const declaration of statement.declarationList.declarations) {
      if (
        isIdentifier(declaration.name) && declaration.name.text === 'allDatabaseAdapters'
        && declaration.initializer
        && isObjectLiteralExpression(declaration.initializer)
      ) {
        for (const property of declaration.initializer.properties) {
          if (isPropertyAssignment(property)) {
            if (isIdentifier(property.name)) {
              result.push(property.name.text)
            }

            else if (isStringLiteral(property.name)) {
              result.push(property.name.text)
            }
          }
        }
      }
    }
  }

  return result
}

let databaseAdapterNames: string[] | null = null

function isRunningIntegrationTest(request: vscode.TestRunRequest): boolean {
  if (request.include) {
    for (const test of request.include) {
      if (test.uri) {
        const filename = vscode.workspace.asRelativePath(test.uri)
        return filename.endsWith('int.spec.ts')
      }
    }
  }

  return false
}

export async function resolveEnvForPayloadMonorepoTest(request: vscode.TestRunRequest): Promise<Record<string, string>> {
  if (!databaseAdapterNames) {
    const { workspaceFolders } = vscode.workspace
    if (!workspaceFolders) {
      return {}
    }

    const rootPath = workspaceFolders[0].uri.fsPath

    const databaseAdapterPath = path.resolve(rootPath, 'test', 'generateDatabaseAdapter.ts')

    if (!fs.existsSync(databaseAdapterPath)) {
      return {}
    }

    const databaseAdapterSource = await fs.promises.readFile(databaseAdapterPath, 'utf-8')
    databaseAdapterNames = collectDatabaseAdapterNames(databaseAdapterSource)
  }

  if (!isRunningIntegrationTest(request))
    return {}

  const selected = await vscode.window.showQuickPick(databaseAdapterNames, {
    placeHolder: 'Choose PAYLOAD_DATABASE',
  })

  if (!selected) {
    return {}
  }

  return {
    PAYLOAD_DATABASE: selected,
  }
}
