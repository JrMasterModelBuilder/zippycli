# zippycli

An unofficial Zippyshare CLI

[![npm](https://img.shields.io/npm/v/zippycli.svg)](https://npmjs.com/package/zippycli)
[![node](https://img.shields.io/node/v/zippycli.svg)](https://nodejs.org)

[![size](https://packagephobia.now.sh/badge?p=zippycli)](https://packagephobia.now.sh/result?p=zippycli)
[![downloads](https://img.shields.io/npm/dm/zippycli.svg)](https://npmcharts.com/compare/zippycli?minimal=true)

[![Build Status](https://github.com/JrMasterModelBuilder/zippycli/workflows/main/badge.svg?branch=master)](https://github.com/JrMasterModelBuilder/zippycli/actions?query=workflow%3Amain+branch%3Amaster)

# Overview

Currently supports downloading files and extracting download info from download pages.

# Usage

<!-- usage -->
```sh-session
$ npm install -g zippycli
$ zippycli COMMAND
running command...
$ zippycli (-v|--version|version)
zippycli/1.4.2 darwin-arm64 node-v16.13.0
$ zippycli --help [COMMAND]
USAGE
  $ zippycli COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`zippycli download SOURCE`](#zippycli-download-source)
* [`zippycli extract SOURCE`](#zippycli-extract-source)
* [`zippycli help [COMMAND]`](#zippycli-help-command)
* [`zippycli info`](#zippycli-info)

## `zippycli download SOURCE`

download file from source

```
USAGE
  $ zippycli download SOURCE

ARGUMENTS
  SOURCE  source to download from

OPTIONS
  -d, --dir=dir          output directory
  -h, --help             show CLI help
  -i, --input            source is input file with a URL on each line
  -m, --mtime            use server modified time if available
  -o, --output=output    output file
  -t, --timeout=timeout  [default: 60] request timeout in seconds
  -u, --update=update    [default: 1000] update interval in milliseconds

ALIASES
  $ zippycli dl
  $ zippycli d
```

_See code: [src/commands/download.ts](https://github.com/JrMasterModelBuilder/zippycli/blob/v1.4.2/src/commands/download.ts)_

## `zippycli extract SOURCE`

extract data about download

```
USAGE
  $ zippycli extract SOURCE

ARGUMENTS
  SOURCE  source to extract from

OPTIONS
  -f, --format=text|json  [default: text] output format
  -h, --help              show CLI help
  -i, --input             source is input file with a URL on each line
  -t, --timeout=timeout   [default: 60] request timeout in seconds

ALIASES
  $ zippycli ex
  $ zippycli e
```

_See code: [src/commands/extract.ts](https://github.com/JrMasterModelBuilder/zippycli/blob/v1.4.2/src/commands/extract.ts)_

## `zippycli help [COMMAND]`

display help for zippycli

```
USAGE
  $ zippycli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.4/src/commands/help.ts)_

## `zippycli info`

display info about program

```
USAGE
  $ zippycli info

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/info.ts](https://github.com/JrMasterModelBuilder/zippycli/blob/v1.4.2/src/commands/info.ts)_
<!-- commandsstop -->

# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.

# License

Copyright (c) 2019-2021 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.
