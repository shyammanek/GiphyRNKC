import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  TextInput,
  FlatList,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Switch,
  Appearance,
  Alert,
  ToastAndroid,
  Platform,
  Image,
} from 'react-native';
import {debounce, uniqBy} from 'lodash';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import FastImage from 'react-native-fast-image';

const GiphyStore = () => {
  const [theme, setTheme] = useState(Appearance.getColorScheme() || 'light');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [gifs, setGifs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [playingGifIndex, setPlayingGifIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [hasMaxLimit, setHasMaxLimit] = useState(false);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    fetchGifs();
  }, []);

  const fetchGifs = async () => {
    console.log('Fetching', offset);
    try {
      setFetching(true);
      const url = searchKeyword
        ? `https://api.giphy.com/v1/gifs/search?q=${searchKeyword}&offset=${offset}&api_key=xPd7f2rkxXllCCWZITxa8LCHrlRwmbuJ`
        : `https://api.giphy.com/v1/gifs/trending?offset=${offset}&api_key=xPd7f2rkxXllCCWZITxa8LCHrlRwmbuJ`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.data.length > 0) {
        if (offset == 0) {
          setGifs(data.data.map(item => ({...item, paused: true})));
          setOffset(offset + 1);
        } else {
          if (data.data.length < 50) {
            setHasMaxLimit(true);
            setGifs(prevGifs => uniqBy([...prevGifs, ...data.data], 'id'));
          } else {
            setOffset(offset + 1);
            setGifs(prevGifs => {
              return uniqBy([...prevGifs, ...data.data], 'id');
            });
          }
        }
      } else {
        setHasMaxLimit(true);
        setLoading(false);
        setDataError('Invalid Search');
        setGifs([]);
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setHasMaxLimit(true);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleSearch = debounce(() => {
    setOffset(0);
    setLoading(true);
    fetchGifs();
    if (searchKeyword == '') {
      setHasMaxLimit(false);
    }
  }, 400);

  const handleEndReached = () => {
    if (!hasMaxLimit && !fetching) {
      fetchGifs();
    }
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const shareGif = async (url, fileName) => {
    const downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;

    try {
      RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadDest,
      }).promise.then(res => {
        if (res.statusCode === 200) {
          Share.open({url: `file://${downloadDest}`});
          if (Platform.OS === 'android') {
            ToastAndroid.show(
              `File downloaded ${downloadDest.toString()}`,
              ToastAndroid.TOP,
            );
          } else {
            console.log('File downloaded  ', downloadDest);
          }
        } else {
          Alert.alert('Error!', 'File not downloaded');
        }
      });
    } catch (err) {
      console.error('Error downloading file: ', err);
    }
  };

  const GifCard = ({item, index}) => {
    const togglePlayPause = () => {
      let tempGif = [...gifs];
      tempGif[index].paused = !tempGif[index].paused;
      setGifs(tempGif);
    };

    const handleShare = () => {
      let newDateTime = new Date().valueOf();
      shareGif(
        item.images.fixed_height.url,
        `${newDateTime}_${item.title}.gif`,
      );
    };

    const handleDownload = () => {
      let newDateTime = new Date().valueOf();
      downloadGif(
        item.images.fixed_height.url,
        `${newDateTime}_${item.title}.gif`,
      );
    };

    return (
      <View style={styles.gifCard}>
        <TouchableOpacity onPress={togglePlayPause}>
          {item.paused ? (
            <FastImage
              source={{uri: item.images.fixed_height.url}}
              style={styles.gifImage}
              onLoad={() => {
                if (playingGifIndex === index) {
                  setIsPlaying(true);
                }
              }}
              resizeMode={FastImage.resizeMode.contain}></FastImage>
          ) : (
            <Image
              source={{uri: item.images.fixed_height.url}}
              style={[styles.gifImage, {backgroundColor: 'black'}]}
            />
          )}

          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={togglePlayPause}>
            <Text style={styles.playPauseButtonText}>
              {item.paused ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                borderWidth: 1,
                borderColor: theme == 'light' ? '#000' : '#FFF',
              },
            ]}
            onPress={handleShare}>
            <Text style={{
              color: theme == 'light' ? '#000' : '#FFF',
            }}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                borderWidth: 1,
                borderColor: theme == 'light' ? '#000' : '#FFF',
              },
            ]}
            onPress={handleDownload}>
             <Text style={{
              color: theme == 'light' ? '#000' : '#FFF',
            }}>Download</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const downloadGif = async (url, fileName) => {
    const downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    try {
      RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadDest,
      }).promise.then(res => {
        if (res.statusCode === 200) {
          if (Platform.OS === 'android') {
            ToastAndroid.show(
              `File downloaded ${downloadDest.toString()}`,
              ToastAndroid.TOP,
            );
          } else {
            Alert.alert('File downloaded  ', downloadDest);
          }
        } else {
          Alert.alert('Error!', 'File not downloaded');
        }
      });
    } catch (err) {
      console.error('Error downloading file: ', err);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme === 'dark' ? 'black' : 'white',
        },
      ]}>
      <View
        style={[
          styles.themeSwitchContainer,
          {backgroundColor: theme === 'dark' ? 'black' : 'white'},
        ]}>
        <Text
          style={[
            styles.headerText,
            {
              color: theme === 'dark' ? 'white' : 'black',
            },
          ]}>
          {'Giphy Store'}
        </Text>

        <View
          style={{
            backgroundColor: theme === 'dark' ? 'black' : 'white',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <Text
            style={[
              styles.headerText,
              {
                color: theme === 'dark' ? 'white' : 'black',
              },
            ]}>
            {'Theme'}
          </Text>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            style={styles.themeSwitch}
            trackColor={{false: 'grey', true: 'white'}}
          />
        </View>
      </View>

      <View style={styles.header}>
        <TextInput
          style={[
            styles.searchInput,
            {
              borderColor: theme === 'dark' ? 'white' : 'grey',
              color: theme === 'dark' ? 'white' : 'black',
            },
          ]}
          placeholderTextColor={theme === 'dark' ? 'white' : 'grey'}
          placeholder="Search GIFs"
          value={searchKeyword}
          onChangeText={text => setSearchKeyword(text)}
          onBlur={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#0f0fff" />
      ) : (
        <FlatList
          data={gifs}
          keyExtractor={item => item.id}
          renderItem={({item, index}) => <GifCard item={item} index={index} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 80,
          }}
          // initialNumToRender={15}
          // windowSize={35}
          ListEmptyComponent={() => (
            <View style={styles.loader}>
              <Text>{dataError}</Text>
            </View>
          )}
          ListFooterComponent={
            fetching &&
            !hasMaxLimit && (
              <ActivityIndicator
                style={styles.loader}
                size="large"
                color="#0f0fff"
              />
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  searchInput: {
    height: 40,
    width: '78%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 16,
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#0f0fff',
    borderRadius: 10,
  },
  searchButtonText: {
    color: '#fff',
  },
  themeSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 17,
  },
  themeSwitch: {
    transform: [{scaleX: 1.5}, {scaleY: 1.5}],
  },
  gifCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    borderColor: 'grey',
    borderWidth: 1,
  },
  gifImage: {
    width: 300,
    height: 200,
    marginBottom: 8,
  },
  playPauseButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 5,
  },
  playPauseButtonText: {
    color: 'white',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GiphyStore;
