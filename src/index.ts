import { Command, Option } from 'commander'
import { findFiles } from 'finder'
import download from 'download'
import logger from 'logger'
import fs from 'fs-extra'
import path from 'path'

/**
 * main function
 */
const handle = async (distURL: string, tmpDir: string) => {
  // regex for finding paths
  const pathRegex = /"([^"]*)"/g
  
  // the base path without the file
  const basePath = path.dirname(distURL).replace(':/', '://')

  // the filename of the dist URL
  const fileName = path.basename(distURL).split('?')[0]

  // check if file is a dist file
  if (fileName !== 'dist.js') {
    logger.error('please provide the dist file of the frontpage')
    process.exit(1)
  }

  // create temporary directory
  await fs.mkdir(tmpDir, { recursive: true })

  // download the fist file
  await download(distURL, tmpDir)

  // get the contents of the file
  const content = await fs.readFile(path.join(tmpDir, fileName), { encoding: 'utf8' })

  // find potential files
  const potentialFiles: string[] = (content.match(pathRegex) ?? [])
    .map(x => x.slice(x.startsWith('"') ? 1 : 0, x.length - 1))

  // log count of potential files
  logger.info(`found ${potentialFiles.length} potential files.`)

  // finds the files from the potential files
  const foundFiles = findFiles(tmpDir, potentialFiles)
  
  // download each found file
  for (const foundFile of foundFiles) {
    // create the export directory
    const exportDir = path.join(tmpDir, path.dirname(foundFile))
    await fs.mkdir(exportDir, { recursive: true })

    // formats the download path
    const downloadPath = path.join(basePath, foundFile).replace(':/', '://')

    try {
      // downloads the file
      await download(downloadPath, exportDir)
      logger.info(`downloaded ${foundFile}`)
    } catch {
      logger.warn(`failed to download ${foundFile}`)
    }
  }
}

// creates the CLI
const program = (new Command())
  .addOption(new Option('-o, --out <directory>', 'the output directory').default('export'))
  .argument('<url>', 'url for the dist file')
  .action((url) => handle(url, program.opts().out))
  .version('1.0.0')

// parses the CLI
program.parse()
