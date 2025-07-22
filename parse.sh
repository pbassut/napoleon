#!/usr/bin/env fish

# Usage: pretty_json_log.fish path/to/logfile.log [output_file]

set logfile $argv[1]
set outputfile $argv[2]

if not test -f $logfile
    echo "Error: '$logfile' does not exist."
    exit 1
end

# If an output file was specified, redirect output
if test -n "$outputfile"
    echo "" > $outputfile  # Clear output file
    for line in (cat $logfile)
        echo $line | jq . >> $outputfile
    end
    echo "Pretty-printed JSON saved to $outputfile"
else
    for line in (cat $logfile)
        echo $line | jq .
    end
end
