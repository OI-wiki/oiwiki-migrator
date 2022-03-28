#!/usr/bin/env node

import { MdBookPreprocessorBuilder } from 'mdbook-nodejs-preprocessor-builder'
import { remark } from 'remark'
import remarkDetails from 'remark-details'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import myCodesFold from './markdown/codes.js'
import myDetailsToAst from './markdown/details-cb.js'
import myDetailsSummary from './markdown/details.js'

const Remark = remark()
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDirective)
  .use(remarkDetails)
  .use(myCodesFold)
  .use(myDetailsSummary)
  .use(myDetailsToAst)

MdBookPreprocessorBuilder.builder()
  .withRendererSupport('html')
  .withRawContentHandler((chapter) => {
    const cont = chapter.content
    chapter.content = Remark().processSync(cont).toString()
    return chapter
  })
  .ready()
