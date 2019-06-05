VERSION=10.16.0

# Obtain node binaries
mkdir -p dist
cd dist
mkdir -p node

# Linux x64
if [ ! -d "node/node-v$VERSION-linux-x64" ]; then
	echo Downloading linux-x64 ...
	wget -qO- "https://nodejs.org/dist/v$VERSION/node-v$VERSION-linux-x64.tar.xz" | tar -xJf - -C node
fi



# Build zip files
# Linux x64
echo Creating linux-x64 files ...
mkdir -p linux-x64 && cd $_
cp -r "../node/node-v$VERSION-linux-x64" node
rsync -a ../../ vocho --exclude dist --exclude .git
cat >run.sh <<EOL
#!/usr/bin/env bash
cd \`dirname \$0\`
node/bin/node vocho/src/index.js
EOL
chmod +x run.sh

echo Tarballing linux-x64 ...
tar -cJf ../linux-x64.tar.xz *
echo Cleaning up from linux-x64
cd .. && rm -rf linux-x64
