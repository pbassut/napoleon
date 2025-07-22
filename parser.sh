#!/usr/bin/env fish

# Usage: pretty_ndjson.fish path/to/log.log [output_file]

set logfile $argv[1]
set outputfile $argv[2]

if not test -f $logfile
    echo "Error: '$logfile' does not exist."
    exit 1
end

function parse_nested_json --argument line
    set outer (echo $line | jq -r '.content' 2>/dev/null)
    if test "$status" -eq 0 -a -n "$outer"
        echo $outer | jq -r '.message' 2>/dev/null | jq .
    else
        echo "⚠️  Failed to parse line"
    end
end

if test -n "$outputfile"
    echo "" > $outputfile
    for line in (cat $logfile)
        parse_nested_json "$line" >> $outputfile
    end
    echo "✅ Output saved to $outputfile"
else
    for line in (cat $logfile)
        parse_nested_json "$line"
    end
end
