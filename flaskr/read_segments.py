import os
import re
from json import dumps

DATA_FILENAME = "./flaskr/data/segments.csv"
OUT_COL_SEP = ','
OUT_ROW_SEP = ';'

# Simply counts the number of each possible delimiter to guess which one should be used
def detect_delimiter(lines):
    DELIMS = [',', ':', ';']
    max_count = 0
    probable_delim = ','
    for delim in DELIMS:
        count = 0
        for line in lines:
            count += line.count(delim)
        if count > max_count:
            max_count = count
            probable_delim = delim
    return probable_delim

def sanitize(str):
    return str.replace(OUT_COL_SEP, '').replace(OUT_ROW_SEP, '')

def read_segments_file(filename):
    sg = lambda t: str((t-1)//60) # get slicegroup index from total
    data = ""
    with open(DATA_FILENAME, 'r') as f:
        lines = []
        f.readline() # ignore column titles
        while True:
            line = f.readline()
            if not line: 
                break
            lines.append(line)
        inSep = detect_delimiter(lines)
        for line in lines:
            row = line.split(inSep)
            if all((len(w) == 0 or w == '\n') for w in row): #stop when one empty line is reached
                break
            for i in range(len(row)-2):
                data += sanitize(row[i]) + OUT_COL_SEP
            length_str = sanitize(row[len(row)-2])
            total_str = sanitize(row[len(row)-1][:-1]) # discard newline
            length = int(length_str)
            total = int(total_str)
            if total // 60 != (total-length) // 60: # if segment spans two or more slice groups
                l0 = 60 - (total - length)
                l1 = length - l0
                t0 = total - length + l0
                t1 = t0 + l1
                data += str(l0) + OUT_COL_SEP + str(t0) + OUT_COL_SEP + sg(t0) + OUT_ROW_SEP
                for j in range(len(row)-2):
                    data += sanitize(row[j]) + OUT_COL_SEP
                data += str(l1) + OUT_COL_SEP + str(t1) + OUT_COL_SEP + sg(t1) + OUT_ROW_SEP
                length = l1
                total = t1
            else: 
                data += length_str + OUT_COL_SEP + total_str + OUT_COL_SEP + sg(total) + OUT_ROW_SEP
    return data

def segments_json():
    data = read_segments_file(DATA_FILENAME)
    segments = list()
    for segment_raw in data.split(OUT_ROW_SEP)[:-1]: # discard empty row after last separator
        segment = dict()
        elements_raw = segment_raw.split(OUT_COL_SEP)
        segment["title"]        = elements_raw[0]
        segment["type"]         = elements_raw[1]
        segment["chronology"]   = elements_raw[2]
        segment["length"]       = elements_raw[3]
        segment["total"]        = elements_raw[4]
        segment["slicegroup"]   = elements_raw[5]
        segments.append(segment)
    segments_json = dumps(segments)
    return segments_json
