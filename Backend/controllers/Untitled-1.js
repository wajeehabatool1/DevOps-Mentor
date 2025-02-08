const redisClientPool = require('../redis/redis-server');
const dockerClientPool = require('../docker/docker_connection');
const { setUpSocketServer, getIo } = require('../socketServer/socket');
const Bull = require("bull");
const stream = require('stream');
const net = require('net');
const { resolve } = require('path');
const fs =  require('fs');
const { exec } = require('child_process');
//const nginxConfigPath = '/etc/nginx/conf.d/devops.conf';
const defaultConfigPath = '/etc/nginx/sites-available/default';


const containerStart = new Bull("linuxContainerStart", { redis: { port: 6379, host: "localhost" } });
const containerExec = new Bull("linuxContainerExecute", { redis: { port: 6379, host: "localhost" } });
const containerClose = new Bull("linuxContainerClose", { redis: { port: 6379, host: "localhost" } });


const getRandomPort = async () =>{
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(0,() => {
            const { port } = server.address();
            server.close(() => resolve(port));
        })
    });
};

const ensureServerBlock = () => {
    let configContent = ""
  
    // Check if the file exists
    if (fs.existsSync(nginxConfigPath)) {
      configContent = fs.readFileSync(nginxConfigPath, "utf-8")
    }
  
    // Check if "server {" already exists in the file
    if (!configContent.includes("server {")) {
      fs.writeFileSync(nginxConfigPath, "server {\n    listen 80;\n    server_name _;\n}\n", "utf-8")
    }
  }
  
  /*const updateNginxConfig = async (userSocketId, jenkinsPort) => {
    ensureServerBlock()
  
    let configContent = fs.readFileSync(nginxConfigPath, "utf-8")
  
    const locationBlock = `
      location /${userSocketId}/jenkins/ {
          proxy_pass http://localhost:${jenkinsPort}/;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      }
      `
  
    // Find the end of the server block
    const serverBlockEndIndex = configContent.lastIndexOf("}")
  
    if (serverBlockEndIndex !== -1) {
      // Insert the new location block just before the closing brace of the server block
      configContent =
        configContent.slice(0, serverBlockEndIndex) + locationBlock + configContent.slice(serverBlockEndIndex)
  
      fs.writeFileSync(nginxConfigPath, configContent, "utf-8")
  
      exec("sudo nginx -s reload", (error, stdout, stderr) => {
        if (error) {
          console.error(`Nginx reload error: ${error.message}`)
          return
        }
        if (stderr) console.error(`Nginx reload stderr: ${stderr}`)
        console.log(`Nginx reloaded successfully for user ${userSocketId}`)
      })
    } else {
      console.error("Could not find the end of the server block in Nginx config")
    }
  }*/

  
  const updateNginxConfig = async (userSocketId, jenkinsPort) => {

    let defaultConfigContent = fs.readFileSync(defaultConfigPath, 'utf-8');

    const locationBlock = `
      location /${userSocketId}/jenkins/ {
          proxy_pass http://127.0.0.1:${jenkinsPort}/;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_redirect off;
          rewrite ^/jenkins(/.*)$ $1 break;
      }
    `;

    // Find the end of the server block in the Nginx config
    const serverBlockEndIndex = defaultConfigContent.lastIndexOf("}");

    if (serverBlockEndIndex !== -1) {
        // Insert the new location block just before the closing brace of the server block
        defaultConfigContent =
            defaultConfigContent.slice(0, serverBlockEndIndex) + locationBlock + defaultConfigContent.slice(serverBlockEndIndex);

        // Write back to the default Nginx configuration
        fs.writeFileSync(defaultConfigPath, defaultConfigContent, "utf-8");

        // Reload Nginx to apply the changes
        exec("sudo nginx -s reload", (error, stdout, stderr) => {
            if (error) {
                console.error(`Nginx reload error: ${error.message}`);
                return;
            }
            if (stderr) console.error(`Nginx reload stderr: ${stderr}`);
            console.log(`Nginx reloaded successfully for user ${userSocketId}`);
        });
    } else {
        console.error("Could not find the end of the server block in the default config");
    }
};




/*const setupJenkinsNamespace = async () => {
    const io = getIo();
    const jenkinsNamespace = io.of('/jenkins');
    console.log("Initializing Jenkins Namespace...");
    jenkinsNamespace.on('connection', async (socket) => {

        let dockerClient = await dockerClientPool.borrowClient();
        let redisClient = await redisClientPool.borrowClient();
        
        const userId = socket.id;
        const jenkinsPort = await getRandomPort();
        const jenkinsClientPort =  await getRandomPort();

        const jenkinsContainer = await dockerClient.createContainer({
            Image: 'jenkins/jenkins:lts',
            Cmd: ['/bin/bash'],
            Tty: true,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            OpenStdin: true,
            StdinOnce: false,
            HostConfig: {
              HostConfig: {
                PortBindings: {
                    "8080/tcp": [{ HostPort: `${jenkinsPort}`}],
                    "50000/tcp": [{ HostPort: `${jenkinsClientPort}`}]
                }
              },
              Privileged: true, 
              CapAdd: ['ALL'],
            },
          });
        
        await jenkinsContainer.start();
        const jenkinsContainerId = jenkinsContainer.id;

        await redisClient.set(`jenkins:${userId}`, JSON.stringify({
            containerId: jenkinsContainerId,
            port: jenkinsPort
        }));

        const jenkinsURL = `http://34.47.137.63:80/${userId}/jenkins`;
        console.log(`Jenkins UI for ${userId}: ${jenkinsURL}`);

        await updateNginxConfig(userId, jenkinsPort);

        const exec = await jenkinsContainer.exec({
            Cmd: ['/bin/bash'],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
        });

        const stream = await exec.start({hijack: true, stdin: true});

        stream.on('data', (chunk) => {
            socket.emit('output', chunk.toString());
        });
        
        socket.on('command', async (command) => {
            if (command !== "done_lab") {
              stream.write(command);
            }
          });

    })
}*/

const setupJenkinsNamespace = async () => {
  const io = getIo();
  const jenkinsNamespace = io.of('/jenkins');
  console.log("Initializing Jenkins Namespace...");
  
  jenkinsNamespace.on('connection', async (socket) => {
      let dockerClient = await dockerClientPool.borrowClient();
      let redisClient = await redisClientPool.borrowClient();
      
      const userId = socket.id;
      const jenkinsPort = await getRandomPort();
      const jenkinsClientPort =  await getRandomPort();

      const jenkinsContainer = await dockerClient.createContainer({
          Image: 'jenkins/jenkins:lts',
          Cmd: ['/bin/bash'],
          Tty: true,
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          OpenStdin: true,
          StdinOnce: false,
          HostConfig: {
            HostConfig: {
              PortBindings: {
                  "8080/tcp": [{ HostPort: `${jenkinsPort}`}],
                  "50000/tcp": [{ HostPort: `${jenkinsClientPort}`}]
              }
            },
            Privileged: true, 
            CapAdd: ['ALL'],
          },
      });
      
      await jenkinsContainer.start();
      const jenkinsContainerId = jenkinsContainer.id;

      await redisClient.set(`jenkins:${userId}`, JSON.stringify({
          containerId: jenkinsContainerId,
          port: jenkinsPort
      }));

      const jenkinsURL = `http://34.47.137.63:80/${userId}/jenkins`;
      console.log(`Jenkins UI for ${userId}: ${jenkinsURL}`);

      await updateNginxConfig(userId, jenkinsPort);

      const exec = await jenkinsContainer.exec({
          Cmd: ['/bin/bash'],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
      });

      const stream = await exec.start({hijack: true, stdin: true});

      stream.on('data', (chunk) => {
          socket.emit('output', chunk.toString());
      });
      
      socket.on('command', async (command) => {
          if (command !== "done_lab") {
            stream.write(command);
          }
      });
      
      socket.on('disconnect', async () => {
          console.log(`User disconnected: ${socket.id}`);
          const storedContainerId = await redisClient.get(`jenkins:${socket.id}`);
          if (storedContainerId) {
              const containerToStop = dockerClient.getContainer(JSON.parse(storedContainerId).containerId);
              await containerToStop.stop();
              await containerToStop.remove();
              console.log(`Container ${JSON.parse(storedContainerId).containerId} stopped and removed for socket ID: ${socket.id}`);
          }
          
          // Remove the container ID from Redis
          await redisClient.del(`jenkins:${socket.id}`);
      });
  });
};


module.exports = setupJenkinsNamespace;