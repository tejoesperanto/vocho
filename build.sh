VERSION=10.16.0

# Obtain node binaries
mkdir -p dist
cd dist
mkdir -p node

# Linux x64
if [ ! -d "node/node-v$VERSION-linux-x64" ]; then
	echo Downloading node linux-x64 ...
	wget -qO- "https://nodejs.org/dist/v$VERSION/node-v$VERSION-linux-x64.tar.xz" | tar -xJf - -C node
fi

# Darwin x64
if [ ! -d "node/node-v$VERSION-darwin-x64" ]; then
	echo Downloading node darwin-x64 ...
	wget -qO- "https://nodejs.org/dist/v$VERSION/node-v$VERSION-darwin-x64.tar.gz" | tar -xzf - -C node
fi



# Build zip files
# Linux x64
echo Creating linux-x64 files ...
mkdir -p linux-x64 && cd $_
cp -r "../node/node-v$VERSION-linux-x64" node
rsync -a ../../ vocho --exclude dist --exclude .git --exclude node_modules
cat >run.sh <<EOL
#!/usr/bin/env bash
cd \`dirname \$0\`
cd vocho
if [ ! -d node_modules ]; then
	../node/bin/node ../node/bin/npm i
fi
../node/bin/node src/index.js
EOL
chmod +x run.sh

echo Tarballing linux-x64 ...
tar -cJf ../linux-x64.tar.xz *
echo Cleaning up from linux-x64
cd .. && rm -rf linux-x64

# Darwin x64
echo Creating darwin-x64 files ...
mkdir -p darwin-x64 && cd $_
cp -r "../node/node-v$VERSION-darwin-x64" node
rsync -a ../../ vocho --exclude dist --exclude .git --exclude node_modules
cat >run.sh <<EOL
#!/usr/bin/env bash
cd \`dirname \$0\`
cd vocho
if [ ! -d node_modules ]; then
	../node/bin/node ../node/bin/npm i
fi
../node/bin/node src/index.js
EOL
chmod +x run.sh

echo Tarballing darwin-x64 ...
tar -cJf ../darwin-x64.tar.xz *
echo Cleaning up from darwin-x64
cd .. && rm -rf darwin-x64
