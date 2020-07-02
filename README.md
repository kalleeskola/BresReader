# BresReader
Reads board result format (\*.bres) from given byte stream into a JavaScript variable

**Note:** Indexing of the following arrays is different from the original format for performance issue: *ESImage1d8*, *[U/D/F/R]SliceData* and *[U/UF/UR/D/DF/DR]LightLevel* 

**Note:** Variable names and meaning of variable values follow NOVA format in case of they differ from XP/HD format (*LightLevel*s and Thickness sensor *ErrorCode*).

## Usage:

### Read a file and save it as JSON:

```
<!DOCTYPE html>
<html>
    <head>
        <script type="text/javascript" src="Ext/DelphiByteStreamReader.js"></script>
        <script type="text/javascript" src="bresDefs.js"></script>
        <script type="text/javascript" src="BresReader.js"></script>
        <script type="text/javascript">
            
            function download(content, filename, contentType) {
                var a = document.createElement("a");
                var file = new Blob([content], {type: contentType});
                a.href = URL.createObjectURL(file);
                a.download = filename;
                a.click();
            }
            
            function readBoard(filePath) {
                var fileReader = new FileReader();
                
                if (filePath.files && filePath.files[0]) {
                    fileReader.onload = function(e) {
                        var output = e.target.result;

                        // Load board
                        
                        var br = new BresReader();
                        var board = br.readBres(output);

                        // Save as JSON
                        
                        var filename = filePath.value.replace(/^.*[\\\/]/, '');
                        var jsonFilename = filename.split('.').slice(0, -1).join('.') + '.json';
                        download(JSON.stringify(board), jsonFilename, 'application/json');
                    };
                    fileReader.readAsArrayBuffer(filePath.files[0]);
                }
            }
        </script>
    </head>
    <body>
        <input type="file" onchange='readBoard(this)' />
    </body>
</html>
```
