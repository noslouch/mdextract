require './setup'

processText = null

describe 'Process text', ->
  before ->
    processText = mdextract.Document::processText

  beforeEach ->
    @block = {}

  it 'heading', ->
    processText """
    constructor:
    ran on init
    """, @block

    expect(@block.heading).eq 'constructor'
    expect(@block.body).eq 'ran on init'

  it 'subheading', ->
    processText """
    map : _.map()
    maps function to elements
    """, @block

    expect(@block.heading).eq 'map'
    expect(@block.subheading).eq '_.map()'
    expect(@block.body).eq 'maps function to elements'

  it 'inline', ->
    processText """
    map: maps function to elements
    """, @block

    expect(@block.heading).eq 'map'
    expect(@block.body).eq 'maps function to elements'

  it 'inline2', ->
    processText """
    map: maps a function to
    multiple elements
    """, @block

    expect(@block.heading).eq 'map'
    expect(@block.body).eq 'maps a function to\nmultiple elements'